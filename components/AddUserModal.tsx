import { AddEntityModal } from './AddEntityModal';

interface AddUserModalProps {
  onUserAdded?: () => void;
}

export function AddUserModal({ onUserAdded }: AddUserModalProps) {
  const handleSubmit = async (data: Record<string, any>) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          username: data.username,
          role_id: parseInt(data.role_id),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create user');
      }

      if (onUserAdded) {
        onUserAdded();
      }
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };

  const fields = [
    {
      name: 'username',
      label: 'Username',
      type: 'text' as const,
      required: true,
    },
    {
      name: 'email',
      label: 'Email',
      type: 'text' as const,
      required: true,
    },
    {
      name: 'password',
      label: 'Password',
      type: 'text' as const,
      required: true,
    },
    {
      name: 'role_id',
      label: 'Role',
      type: 'select' as const,
      required: true,
      options: [
        { value: '1', label: 'Admin' },
        { value: '2', label: 'Manager' },
        { value: '3', label: 'User' },
      ],
    },
  ];

  return (
    <AddEntityModal
      entityName="User"
      fields={fields}
      onSubmit={handleSubmit}
    />
  );
} 