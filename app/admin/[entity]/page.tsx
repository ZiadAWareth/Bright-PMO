import { entityConfig } from '@/lib/entities';
import { Suspense } from 'react';
import axios from '@/lib/axios';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface PageProps {
  params?: Promise<{ entity: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function EntityTable({ entity }: { entity: string }) {
  try {
    const response = await axios.get(`/api/${entity}`);
    const data: any[] = response.data;
    
    if (!Array.isArray(data)) {
      return (
        <div className="p-4 text-red-500">
          Invalid data format received
        </div>
      );
    }

    // Get the first item to determine columns
    const firstItem = data[0];
    if (!firstItem) {
      return <div className="p-4">No data available</div>;
    }

    const columns = Object.keys(firstItem).filter(key => 
      !key.endsWith('_id') && 
      key !== 'created_at' && 
      key !== 'updated_at'
    );

    return (
      <div className="w-full overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item: Record<string, any>, index: number) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {typeof item[column] === 'object' && item[column] !== null
                      ? JSON.stringify(item[column])
                      : item[column]?.toString() || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } catch (error) {
    return (
      <div className="p-4 text-red-500">
        Error loading data: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }
}

export default async function EntityPage({ params }: PageProps) {
  const resolvedParams = params ? await params : { entity: '' };
  const { entity } = resolvedParams;
  const config = entityConfig[entity];

  if (!config) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold">Entity not found</h1>
        <p>The requested entity does not exist in the configuration.</p>
      </div>
    );
  }

  return (
    <div className="p-4 w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{config.label}</h1>
          <p className="text-gray-600">Manage your {config.label.toLowerCase()} here.</p>
        </div>
        <div>
          <Link href={`/admin/${entity}/add`} passHref>
            <Button>
              {`Add ${config.label}`}
            </Button>
          </Link>
        </div>
      </div>
      
      <Suspense fallback={<div>Loading...</div>}>
        <EntityTable entity={entity} />
      </Suspense>
    </div>
  );
}
