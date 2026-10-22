import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { loadEntitlements } from "@/lib/billing/entitlements";
import { PRO_PLUS_MAX_STAFF, planLabel } from "@/lib/billing/plans";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddStaffForm, RemoveStaffButton } from "@/components/staff-forms";
import { PlanLimitNotice } from "@/components/plan-limit-notice";

export default async function StaffPage() {
  const { organizationId, organization, role } = await requireOrg();
  const entitlements = await loadEntitlements(organization);
  const members = await db.membership.findMany({
    where: { organizationId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  const isOwner = role === "OWNER";
  const canManage =
    isOwner && entitlements.proPlus && entitlements.limits.maxStaff > 0;
  const staffFull =
    entitlements.usage.staff >= entitlements.limits.maxStaff &&
    entitlements.limits.maxStaff > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Tim & staf
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Pro+ memungkinkan hingga {PRO_PLUS_MAX_STAFF} karyawan login terpisah.
          Staf bisa kelola operasional; langganan dan kunci Midtrans tetap
          milik owner.
        </p>
      </div>

      {!entitlements.proPlus && (
        <PlanLimitNotice>
          Multi-staf ada di paket Pro+. Paket Anda:{" "}
          {planLabel(entitlements.code)}.{" "}
          <Link href="/billing" className="font-medium underline">
            Upgrade ke Pro+
          </Link>
        </PlanLimitNotice>
      )}

      {!isOwner && (
        <p className="rounded-lg border bg-muted/50 px-4 py-3 text-sm">
          Anda login sebagai staf. Hanya owner yang bisa menambah atau menghapus
          anggota.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Anggota</CardTitle>
          <CardDescription>
            Staf: {entitlements.usage.staff}
            {entitlements.limits.maxStaff > 0
              ? ` / ${entitlements.limits.maxStaff}`
              : " (upgrade Pro+ untuk menambah)"}
          </CardDescription>
        </CardHeader>
        <CardContent className="-mx-2 overflow-x-auto sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead>Sejak</TableHead>
                {canManage && <TableHead>Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.user.name}</TableCell>
                  <TableCell>{m.user.email}</TableCell>
                  <TableCell>
                    <Badge variant={m.role === "OWNER" ? "success" : "secondary"}>
                      {m.role === "OWNER" ? "Owner" : "Staf"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(m.createdAt)}</TableCell>
                  {canManage && (
                    <TableCell>
                      {m.role === "STAFF" ? (
                        <RemoveStaffButton membershipId={m.id} />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>Tambah staf</CardTitle>
            <CardDescription>
              Buat akun baru atau hubungkan email yang sudah terdaftar tanpa
              organisasi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canManage && !staffFull ? (
              <AddStaffForm />
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {staffFull
                    ? `Batas ${PRO_PLUS_MAX_STAFF} staf tercapai. Hapus satu staf dulu untuk menambah lagi.`
                    : "Aktifkan Pro+ untuk menambah staf."}
                </p>
                {!entitlements.proPlus && (
                  <Button asChild className="h-11 w-full sm:w-auto">
                    <Link href="/billing">Ke Langganan</Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
