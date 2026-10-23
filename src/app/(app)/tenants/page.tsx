import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import {
  createTenantAction,
  deleteTenantAction,
} from "@/lib/actions/properties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SetupNextHint } from "@/components/setup-next-hint";
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

export default async function TenantsPage() {
  const { organizationId } = await requireOrg();
  const [tenants, roomCount, firstProperty] = await Promise.all([
    db.tenant.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        phone: true,
        leases: {
          where: { status: "ACTIVE" },
          take: 1,
          select: { room: { select: { code: true } } },
        },
      },
    }),
    db.room.count({ where: { property: { organizationId } } }),
    db.property.findFirst({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Penyewa
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Data penyewa dan nomor WhatsApp untuk tagihan.
        </p>
      </div>

      {roomCount === 0 && (
        <SetupNextHint
          title="Tambah kamar dulu"
          body="Sebelum mendaftarkan penyewa, isi kamar di properti Anda agar nanti bisa check-in."
          href={firstProperty ? `/properties/${firstProperty.id}` : "/properties"}
          cta="Ke properti / kamar"
        />
      )}
      {roomCount > 0 && tenants.length === 0 && (
        <SetupNextHint
          title="Langkah berikutnya: daftar penyewa"
          body="Simpan nama dan nomor WhatsApp. Setelah itu Anda bisa check-in ke kamar kosong."
          href="#tambah-penyewa"
          cta="Isi form di bawah"
        />
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Daftar penyewa</CardTitle>
            <CardDescription>{tenants.length} penyewa</CardDescription>
          </CardHeader>
          <CardContent className="-mx-2 overflow-x-auto sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Kamar aktif</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      Belum ada penyewa. Pakai form &quot;Tambah penyewa&quot;.
                    </TableCell>
                  </TableRow>
                ) : (
                  tenants.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{t.phone}</TableCell>
                      <TableCell>{t.leases[0]?.room.code ?? "-"}</TableCell>
                      <TableCell>
                        <form action={deleteTenantAction}>
                          <input type="hidden" name="id" value={t.id} />
                          <Button type="submit" size="sm" variant="ghost">
                            Hapus
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card id="tambah-penyewa">
          <CardHeader>
            <CardTitle>Tambah penyewa</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createTenantAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Nomor WhatsApp</Label>
                <Input
                  id="phone"
                  name="phone"
                  required
                  placeholder="0812xxxxxxx"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (opsional)</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Catatan</Label>
                <Input id="notes" name="notes" />
              </div>
              <Button type="submit" className="w-full">
                Simpan
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
