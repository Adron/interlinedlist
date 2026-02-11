import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getListById, getListProperties } from '@/lib/lists/queries';
import Link from 'next/link';
import ListDataTable from '@/components/lists/ListDataTable';
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

  const list = await getListById(params.id, user.id);

  if (!list) {
    notFound();
  }

  const properties = await getListProperties(params.id, user.id);

  if (!properties) {
    notFound();
  }

  const isEditMode = searchParams.edit === 'true';
  const isAddMode = searchParams.add === 'true';

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row mb-4">
        <div className="col-12 d-flex justify-content-end">
          <div className="d-flex gap-2">
            {!isEditMode && !isAddMode && (
              <>
                <Link
                  href={`/lists/${params.id}?edit=true`}
                  className="btn btn-outline-secondary"
                >
                  <i className="bx bx-edit me-1"></i>
                  Edit Schema
                </Link>
                <Link
                  href={`/lists/${params.id}?add=true`}
                  className="btn btn-primary"
                >
                  <i className="bx bx-plus me-1"></i>
                  Add Row
                </Link>
              </>
            )}
            {isEditMode && (
              <Link
                href={`/lists/${params.id}`}
                className="btn btn-outline-secondary"
              >
                <i className="bx bx-x me-1"></i>
                Cancel Edit
              </Link>
            )}
            {isAddMode && (
              <Link
                href={`/lists/${params.id}`}
                className="btn btn-outline-secondary"
              >
                <i className="bx bx-x me-1"></i>
                Cancel
              </Link>
            )}
          </div>
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
          </div>
        </div>
      )}
    </div>
  );
}
