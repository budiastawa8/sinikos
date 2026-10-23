import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { isProActive } from "@/lib/billing/plans";
import { getWhatsAppQuotaUsage } from "@/lib/billing/whatsapp-quota";
import { generateInvoicesNowAction } from "@/lib/actions/invoices";
import { GenerateInvoicesButton } from "@/components/generate-invoices-button";
import { InvoiceList } from "@/components/invoice-list";
import { SetupNextHint } from "@/components/setup-next-hint";
import { isOrgMidtransConfigured } from "@/lib/payments/midtrans";

export default async function InvoicesPage() {
  const { organizationId, organization } = await requireOrg();
  const pro = isProActive(organization);
  const midtransReady = isOrgMidtransConfigured(organization);
  const [invoices, waQuota, leaseCount] = await Promise.all([
    db.invoice.findMany({
      where: { organizationId },
      orderBy: [
        { periodYear: "desc" },
        { periodMonth: "desc" },
        { createdAt: "desc" },
      ],
      take: 60,
      select: {
        id: true,
        periodYear: true,
        periodMonth: true,
        amount: true,
        amountPaid: true,
        dueDate: true,
        status: true,
        paymentUrl: true,
        midtransOrderId: true,
        lease: {
          select: {
            tenant: { select: { name: true } },
            room: {
              select: {
                code: true,
                property: { select: { name: true } },
              },
            },
          },
        },
        whatsappLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true },
        },
      },
    }),
    getWhatsAppQuotaUsage(organizationId),
    db.lease.count({
      where: {
        organizationId,
        status: { in: ["ACTIVE", "PENDING"] },
      },
    }),
  ]);

  const listItems = invoices.map((inv) => ({
    id: inv.id,
    periodYear: inv.periodYear,
    periodMonth: inv.periodMonth,
    amount: inv.amount,
    amountPaid: inv.amountPaid,
    dueDate: inv.dueDate.toISOString(),
    status: inv.status,
    paymentUrl: inv.paymentUrl,
    midtransOrderId: inv.midtransOrderId,
    tenantName: inv.lease.tenant.name,
    propertyName: inv.lease.room.property.name,
    roomCode: inv.lease.room.code,
    waStatus: inv.whatsappLogs[0]?.status ?? null,
  }));

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Tagihan
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Catat bayar atau kirim WhatsApp dari tombol Aksi.
            {pro
              ? " Link Midtrans opsional."
              : " Link Midtrans & reminder otomatis di Pro."}{" "}
            <span className="hidden sm:inline">
              Melunasi tagihan check-in pertama mengaktifkan kontrak.{" "}
            </span>
            {!pro && (
              <Link
                href="/billing"
                className="font-medium text-primary underline"
              >
                Lihat langganan
              </Link>
            )}
            {pro && !midtransReady && (
              <>
                {" "}
                <Link
                  href="/panduan#midtrans"
                  className="font-medium text-primary underline"
                >
                  Setup Midtrans
                </Link>
              </>
            )}
            {pro && midtransReady && organization.midtransIsProduction && (
              <>
                {" "}
                <span className="font-medium text-amber-800">Production</span>
                .{" "}
                <Link
                  href="/panduan#production"
                  className="font-medium text-primary underline"
                >
                  Panduan
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <GenerateInvoicesButton action={generateInvoicesNowAction} />
        </div>
      </div>

      {leaseCount === 0 && (
        <SetupNextHint
          title="Belum ada penyewa aktif"
          body="Check-in penyewa ke kamar dulu. Tagihan pertama biasanya muncul otomatis setelah check-in."
          href="/leases"
          cta="Ke kontrak / check-in"
        />
      )}
      {leaseCount > 0 && invoices.length === 0 && (
        <SetupNextHint
          title="Langkah berikutnya: buat tagihan"
          body='Klik "Generate tagihan bulan ini", lalu catat bayar atau kirim WhatsApp dari tombol Aksi.'
          href="#daftar-tagihan"
          cta="Lihat daftar tagihan"
        />
      )}

      {waQuota.exhausted && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Kuota WhatsApp {waQuota.periodLabel} habis ({waQuota.used}/
          {waQuota.limit}). Tombol Kirim WA ditahan
          {pro ? " dan pengiriman otomatis ditunda" : ""}
          ; catat bayar manual tetap bisa
          {!pro ? (
            <>
              .{" "}
              <Link href="/billing" className="font-medium underline">
                Upgrade ke Pro
              </Link>{" "}
              untuk kuota lebih besar dan reminder otomatis.
            </>
          ) : (
            "."
          )}
        </div>
      )}

      <InvoiceList
        invoices={listItems}
        emptyHint={
          leaseCount === 0
            ? "Belum ada tagihan. Check-in penyewa dulu di menu Kontrak."
            : 'Belum ada tagihan. Klik "Generate tagihan bulan ini".'
        }
        pro={pro}
        midtransReady={midtransReady}
        waDisabled={Boolean(waQuota.exhausted)}
      />
    </div>
  );
}
