import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getListWithAncestorChain, getListProperties } from '@/lib/lists/queries';
import ListBreadcrumbs from '@/components/lists/ListBreadcrumbs';
import ListChildLinks from '@/components/lists/ListChildLinks';
import ListDataTable from '@/components/lists/ListDataTable';
import ListAccessSection from '@/components/lists/ListAccessSection';
import ListDetailActions from '@/components/lists/ListDetailActions';
import EditSchemaForm from './EditSchemaForm';
import AddRowForm from './AddRowForm';

interface ListDetailPageProps {
  params: { id: string };
  searchParams: { edit?: string; add?: string };
}

export default async function ListDetailPage({ params, searchParams }: ListDetailPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const result = await getListWithAncestorChain(params.id, user.id);

  if (!result || !result.list) {
    notFound();
  }

  const { list, ancestors } = result;
  const properties = await getListProperties(params.id, user.id);

  if (!properties) {
    notFound();
  }

  const isEditMode = searchParams.edit === 'true';
  const isAddMode = searchParams.add === 'true';

  const breadcrumbItems = [
    { label: 'Lists', href: '/lists' },
    ...ancestors.map((a) => ({ label: a.title, href: `/lists/${a.id}` })),
    ...(isEditMode || isAddMode
      ? [{ label: list.title, href: `/lists/${params.id}` }]
      : [{ label: list.title }]),
    ...(isEditMode ? [{ label: 'Edit Schema' }] : []),
    ...(isAddMode ? [{ label: 'Add Row' }] : []),
  ];

  return (
    <div className="container-fluid container-fluid-max py-4">
      <ListBreadcrumbs items={breadcrumbItems} />
      {list.children && list.children.length > 0 && (
        <ListChildLinks children={list.children} />
      )}
      <div className="row mb-4">
        <div className="col-12 d-flex justify-content-end">
          <ListDetailActions
            listId={params.id}
            listTitle={list.title}
            isEditMode={isEditMode}
            isAddMode={isAddMode}
          />
        </div>
      </div>

      {isEditMode ? (
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <EditSchemaForm listId={params.id} initialSchema={list} />
              </div>
            </div>
          </div>
        </div>
      ) : isAddMode ? (
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <AddRowForm listId={params.id} fields={properties} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="row">
          <div className="col-12">
            <ListDataTable
              listId={params.id}
              fields={properties}
            />
            {list.isPublic && (
              <ListAccessSection
                listId={params.id}
                isPublic={list.isPublic}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
