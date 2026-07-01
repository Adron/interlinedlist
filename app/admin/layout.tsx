import AdminTabs from '@/components/admin/AdminTabs';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-fluid container-fluid-max py-4">
      <AdminTabs />
      {children}
    </div>
  );
}
