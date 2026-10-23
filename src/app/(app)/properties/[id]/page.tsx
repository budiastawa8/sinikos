import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { loadEntitlements } from "@/lib/billing/entitlements";
import { canAdd } from "@/lib/billing/plans";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlanLimitNotice } from "@/components/plan-limit-notice";
import { RoomCreateForm } from "@/components/room-create-form";
import { RoomList } from "@/components/room-list";

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {property.name}
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
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

        <Card>
          <CardHeader>
            <CardTitle>Tambah kamar</CardTitle>
            {!entitlements.active && entitlements.limits.maxRooms != null && (
              <CardDescription>
                Paket Gratis: {entitlements.usage.rooms} dari{" "}
                {entitlements.limits.maxRooms} kamar di seluruh bisnis
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {atRoomLimit ? (
              <PlanLimitNotice>
                Batas kamar paket Gratis sudah tercapai. Kamar yang sudah ada
                tetap bisa diubah statusnya.
              </PlanLimitNotice>
            ) : (
              <RoomCreateForm propertyId={property.id} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
