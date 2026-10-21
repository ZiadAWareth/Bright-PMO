import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import type { ResourceConfig } from '@/lib/field-types';
import { useAuth } from '@/lib/auth';
import { Form } from '@/components/ui/form';
import { AutoFormField } from '@/components/form/auto-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ResourceForm({ config, mode }: { config: ResourceConfig; mode: 'create' | 'edit' }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isEdit = mode === 'edit';
  // Frontend route base (nested under a module when configured); API path is unaffected.
  const base = config.routeBase ?? `/${config.resource}`;

  // A tenant user belongs to exactly one organization — it's carried in their JWT
  // and stamped onto every write by the API's tenant layer, so they must NOT be
  // asked to pick it (and the tenant-scoped list endpoint won't return other orgs
  // to populate the dropdown anyway). Only a platform / super admin, who works
  // across tenants, sees and chooses the organization.
  const isPlatformAdmin = !!user?.isPlatformAdmin || user?.organizationId === 0;
  // Inviting is the default way to let somebody in, but an administrator must be able to set a
  // password directly — mail may not be configured yet, a link may have expired while someone is
  // locked out, or a person may simply need access now. So this is a CHOICE, not a policy.
  const [howIn, setHowIn] = useState('invite'); // 'invite' | 'password'
  const settingPassword = config.invites && howIn === 'password';
  const visibleFields = config.fields.filter((f) => {
    // The app sets these (an auto number): shown on the record's page, never an input.
    if (f.readOnly) return false;
    // The password box appears only once they ask for it; on an ordinary resource it is unchanged.
    if (config.invites && f.kind === 'password' && !settingPassword) return false;
    const isOrgDiscriminator =
      f.name === 'organizationId' ||
      String(f.relation?.resource ?? '').toLowerCase() === 'organization';
    return isPlatformAdmin || !isOrgDiscriminator;
  });

  const form = useForm({
    resolver: zodResolver(config.schema),
    defaultValues: config.defaultValues,
  });

  const create = config.hooks.useCreate();
  const update = config.hooks.useUpdate();
  const one = config.hooks.useOne(isEdit ? id : undefined);

  useEffect(() => {
    if (!isEdit || !one.data) return;
    const record = one.data as Record<string, any>;
    const values: Record<string, unknown> = {};
    for (const f of config.fields) {
      if (f.readOnly) continue;
      let v = record[f.name];
      if (f.list && Array.isArray(v)) {
        v = v.map((x) => (x != null && typeof x === 'object' ? JSON.stringify(x) : String(x))).join('\n');
      }
      if (f.kind === 'date' && v) {
        try { v = new Date(v).toISOString().slice(0, 10); } catch { /* keep raw */ }
      }
      if (f.kind === 'time' && v) {
        try { v = new Date(v).toISOString().slice(11, 16); } catch { /* keep raw */ }
      }
      if ((f.kind === 'decimal' || f.kind === 'bigint') && v != null) v = String(v);
      // A relation is picked from a select, so the form schema types it as a string; the API
      // hands the stored id back as a number. Loaded as-is it failed validation on the first save
      // that did not touch the picker ('Expected string, received number', Loan-desk 2026-09-23).
      if (f.kind === 'relation' && v != null && typeof v !== 'string') v = String(v);
      if (f.kind === 'datetime' && v) {
        try {
          v = new Date(v).toISOString().slice(0, 16);
        } catch {
          /* keep raw */
        }
      }
      if (f.kind === 'json' && v != null && typeof v !== 'string') {
        v = JSON.stringify(v, null, 2);
      }
      values[f.name] = v ?? (f.kind === 'boolean' ? false : '');
    }
    form.reset(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, one.data]);

  // A refused save must never be silent: name the fields and what is wrong with them. Before
  // this, a validation failure only showed under a field that happened to render its message,
  // so the Save button looked dead (Loan-desk 2026-09-23).
  const onInvalid = (errors: Record<string, any>) => {
    const lines = Object.entries(errors).map(([name, err]) => {
      const label = config.fields.find((f) => f.name === name)?.label ?? name;
      return label + ': ' + String(err?.message ?? 'invalid value');
    });
    toast.error('Cannot save — ' + (lines.length ? lines.join('; ') : 'some fields are invalid'));
  };

  const onSubmit = (values: Record<string, unknown>) => {
    const payload: Record<string, unknown> = { ...values };
    for (const f of config.fields) {
      // Never sent: the API refuses a field it sets itself.
      if (f.readOnly) {
        delete payload[f.name];
        continue;
      }
      const v = payload[f.name];
      if (f.list) {
        // One value per line → the element type the column holds. Numeric strings stay strings
        // for decimal/bigint (exact); plain numbers become numbers; everything else is text.
        const lines = typeof v === 'string' ? v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean) : Array.isArray(v) ? v : [];
        payload[f.name] = f.kind === 'number' ? lines.map(Number).filter((n) => !Number.isNaN(n)) : lines;
        continue;
      }
      if (f.kind === 'date' && typeof v === 'string' && v) {
        const d = new Date(v + 'T00:00:00.000Z');
        if (!isNaN(d.getTime())) payload[f.name] = d.toISOString();
      }
      if (f.kind === 'time' && typeof v === 'string' && v) {
        const d = new Date('1970-01-01T' + v + ':00.000Z');
        if (!isNaN(d.getTime())) payload[f.name] = d.toISOString();
      }
      if (f.kind === 'json' && typeof v === 'string' && v) {
        try {
          payload[f.name] = JSON.parse(v);
        } catch {
          /* leave as string; backend validation will surface it */
        }
      }
      if (f.kind === 'datetime' && typeof v === 'string' && v) {
        const d = new Date(v);
        if (!isNaN(d.getTime())) payload[f.name] = d.toISOString();
      }
      // Foreign-key dropdown stores the id as a string; send a number when numeric.
      if (f.kind === 'relation' && typeof v === 'string' && v !== '') {
        payload[f.name] = /^\d+$/.test(v) ? Number(v) : v;
      }
      // Drop empty optional strings so they aren't sent as ''
      if (f.optional && payload[f.name] === '') delete payload[f.name];
    }
    if (isEdit) {
      update.mutate(
        { id: id as string, payload },
        { onSuccess: () => navigate(base) }
      );
    } else {
      create.mutate(payload, {
        onSuccess: async (created: any) => {
          // A login is created with NO password, so the account cannot be used until its owner
          // chooses one. Sending the invitation here, right after the record exists, is what makes
          // "add a person" a complete action — otherwise an administrator leaves the page having
          // created somebody who can never sign in and nothing on screen says so.
          //
          // A failed send does NOT fail the create: the account is real, it shows as pending on the
          // list, and the invitation can be sent again from there once the email settings work.
          if (config.invites && howIn === 'invite' && created?.id != null) {
            try {
              await api.post('/api/auth/invite', { userId: created.id });
              toast.success('Invitation sent. They choose their own password from the emailed link.');
            } catch (err: unknown) {
              const res = (err as { response?: { data?: { message?: string | string[] } } }).response;
              const message = res?.data?.message;
              toast.error(
                'The account was created but the invitation could not be sent: ' +
                  ((Array.isArray(message) ? message.join(', ') : message) || (err as Error).message),
              );
            }
          }
          navigate(base);
        },
      });
    }
  };

  const saving = create.isPending || update.isPending;

  if (isEdit && one.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="grid gap-5 pt-6 sm:grid-cols-2">
            {config.fields.map((f) => (
              <Skeleton key={f.name} className="h-16" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEdit ? `Edit ${config.label}` : `New ${config.label}`}
        </h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                {visibleFields.map((f) => (
                  <AutoFormField key={f.name} config={f} />
                ))}
              </div>
              {config.invites && (
                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  <div className="mb-2 font-medium">
                    {isEdit ? 'Change how they sign in' : 'How will they sign in?'}
                  </div>
                  <label className="flex items-start gap-2">
                    <input
                      type="radio"
                      className="mt-1"
                      checked={howIn === 'invite'}
                      onChange={() => setHowIn('invite')}
                    />
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Email them an invitation</strong> — they
                      choose their own password from a single-use link, so nobody else ever knows it.
                      {isEdit ? ' Any earlier link stops working.' : ''}
                    </span>
                  </label>
                  <label className="mt-2 flex items-start gap-2">
                    <input
                      type="radio"
                      className="mt-1"
                      checked={howIn === 'password'}
                      onChange={() => setHowIn('password')}
                    />
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">Set a password now</strong> — use this when
                      email is not set up yet, or somebody needs letting in immediately. You will have
                      to pass it on yourself, and they can change it later.
                    </span>
                  </label>
                </div>
              )}
              <div className="flex justify-end gap-2 border-t pt-5">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isEdit ? 'Save changes' : `Create ${config.label}`}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
