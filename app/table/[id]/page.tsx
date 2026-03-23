import { TableClient } from './table-client';

export default async function TablePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <TableClient tableId={id} />;
}
