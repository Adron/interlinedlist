import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getListWithAncestorChain, getListProperties } from '@/lib/lists/queries';
import ListBreadcrumbs from '@/components/lists/ListBreadcrumbs';
import ListChildLinks from '@/components/lists/ListChildLinks';
import ListDetailActions from '@/components/lists/ListDetailActions';
import ListDetailViewModel from '@/components/lists/ListDetailViewModel';
import EditSchemaForm from './EditSchemaForm';
import AddRowForm from './AddRowForm';

interface ListDetailPageProps {
  params: Promise<{ id: string }> | { id: string };
  searchParams: Promise<{ edit?: string; add?: string }> | { edit?: string; add?: string };
}

export default async function ListDetailPage({ params, searchParams }: ListDetailPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);

  const result = await getListWithAncestorChain(resolvedParams.id, user.id);

  if (!result || !result.list) {
    notFound();
  }

  const { list, ancestors } = result;
  const properties = await getListProperties(resolvedParams.id, user.id);

  if (!properties) {
    notFound();
  }

  const isEditMode = resolvedSearchParams.edit === 'true';
  const isAddMode = resolvedSearchParams.add === 'true';
  const isGitHubList = (list as { source?: string }).source === 'github';
  const githubRepo = (list as { githubRepo?: string }).githubRepo;

  const breadcrumbItems = [
    { label: 'Lists', href: '/lists' },
    ...ancestors.map((a) => ({ label: a.title, href: `/lists/${a.id}` })),
    ...(isEditMode || isAddMode
      ? [{ label: list.title, href: `/lists/${resolvedParams.id}` }]
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
      {isEditMode ? (
        <>
          <div className="row mb-4">
            <div className="col-12 d-flex justify-content-end">
              <ListDetailActions
                listId={resolvedParams.id}
                listTitle={list.title}
                isEditMode
                isAddMode={false}
                isGitHubList={isGitHubList}
                githubRepo={githubRepo ?? undefined}
              />
            </div>
          </div>
          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-body">
                  <EditSchemaForm listId={resolvedParams.id} initialSchema={list} />
                </div>
              </div>
            </div>
          </div>
        </>
      ) : isAddMode ? (
        <>
          <div className="row mb-4">
            <div className="col-12 d-flex justify-content-end">
              <ListDetailActions
                listId={resolvedParams.id}
                listTitle={list.title}
                isEditMode={false}
                isAddMode
                isGitHubList={isGitHubList}
                githubRepo={githubRepo ?? undefined}
              />
            </div>
          </div>
          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-body">
                  <AddRowForm
                    listId={resolvedParams.id}
                    fields={properties}
                    listSource={isGitHubList ? 'github' : 'local'}
                    githubRepo={githubRepo ?? undefined}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <ListDetailViewModel
          listId={resolvedParams.id}
          listTitle={list.title}
          isPublic={list.isPublic}
          isGitHubList={isGitHubList}
          fields={properties}
          listSource={isGitHubList ? 'github' : 'local'}
          githubRepo={githubRepo ?? undefined}
        />
      )}
    </div>
  );
}
