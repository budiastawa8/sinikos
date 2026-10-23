import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { loadEntitlements } from "@/lib/billing/entitlements";
import { canAdd } from "@/lib/billing/plans";
import { RoomList } from "@/components/room-list";
import {
  RoomCreateCard,
  RoomCreateSheetTrigger,
} from "@/components/room-create-panel";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organizationId, organization } = await requireOrg();
  const entitlements = await loadEntitlements(organization);
  const atRoomLimit = !canAdd(
    entitlements.usage.rooms,
    entitlements.limits.maxRooms,
  );
  const property = await db.property.findFirst({
    where: { id, organizationId },
    include: {
      rooms: {
        orderBy: { code: "asc" },
        include: {
          leases: {
            where: { status: { in: ["ACTIVE", "PENDING"] } },
            take: 1,
            select: { status: true },
          },
        },
      },
    },
  });
  if (!property) notFound();

  const hasRooms = property.rooms.length > 0;
  const usageLabel =
    !entitlements.active && entitlements.limits.maxRooms != null
      ? `Paket Gratis: ${entitlements.usage.rooms} dari ${entitlements.limits.maxRooms} kamar di seluruh bisnis`
      : undefined;

  const createProps = {
    propertyId: property.id,
    atRoomLimit,
    usageLabel,
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight sm:text-3xl">
            {property.name}
          </h1>
          {hasRooms && (
            <div className="xl:hidden">
              <RoomCreateSheetTrigger {...createProps} />
            </div>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          {property.address || "Tanpa alamat"}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <RoomList
          rooms={property.rooms.map((room) => ({
            id: room.id,
            code: room.code,
            price: room.price,
            status: room.status,
            leaseStatus: room.leases[0]?.status ?? null,
          }))}
        />

        <RoomCreateCard
          {...createProps}
          className={hasRooms ? "hidden xl:block" : undefined}
        />
      </div>
    </div>
  );
}
