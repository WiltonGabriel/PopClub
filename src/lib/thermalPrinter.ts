import { Order } from "@/services/orderService";
import { formatDecimal, parseSafeNumber } from "@/lib/formatters";

export function printOrderReceipt(order: Order, storeName = "Pop Shake Sorveteria") {
  if (typeof window === "undefined") return;

  const printWindow = window.open("", "_blank", "width=400,height=600");
  if (!printWindow) {
    alert("Por favor, habilite popups no seu navegador para imprimir o comprovante.");
    return;
  }

  const shortId = order.id.substring(0, 6);
  const createdDate = new Date(order.created_at);
  const dateStr = createdDate.toLocaleDateString("pt-BR");
  const timeStr = createdDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const clientName = order.user?.fullName || order.user?.username || "Cliente Balcão";
  const phone = order.user?.phone || "";

  const isPickup =
    !order.delivery_address?.street ||
    order.delivery_address?.street.toLowerCase().includes("retirada");

  let paymentText = "PIX";
  if (order.payment_method_type === "dinheiro") {
    paymentText = "DINHEIRO";
    if (order.payment_change_for) {
      paymentText += ` (Troco p/ R$ ${formatDecimal(order.payment_change_for)})`;
    }
  } else if (order.payment_method_type === "cartao_maquininha") {
    paymentText = "CARTÃO (MAQUININHA)";
  }

  const itemsHtml = (order.items || [])
    .map((item) => {
      const itemTotal = formatDecimal(parseSafeNumber(item.price_at_time) * parseSafeNumber(item.quantity, 1));
      const unitPrice = formatDecimal(item.price_at_time);
      const addons = (item.selected_addons || item.selectedAddons || []) as Array<{
        name: string;
        groupName?: string;
        price: number;
        quantity: number;
      }>;
      const addonsHtml =
        addons && addons.length > 0
          ? `
        <div style="font-size: 10px; color: #333; padding-left: 10px; margin-top: 2px;">
          ${addons
            .map(
              (a) =>
                `<div>• ${a.quantity > 1 ? `${a.quantity}x ` : ""}${a.name} ${
                  parseSafeNumber(a.price) > 0 ? `(+ R$ ${formatDecimal(parseSafeNumber(a.price) * parseSafeNumber(a.quantity, 1))})` : "(Incluso)"
                }</div>`
            )
            .join("")}
        </div>
      `
          : "";

      return `
      <div style="margin-bottom: 6px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
          <span>${item.quantity}x ${item.product?.name || "Item"}</span>
          <span>R$ ${itemTotal}</span>
        </div>
        <div style="font-size: 11px; color: #444; padding-left: 10px;">
          ${item.quantity > 1 ? `(${item.quantity} x R$ ${unitPrice})` : ""}
          ${item.product?.description ? `<div>${item.product.description}</div>` : ""}
        </div>
        ${addonsHtml}
        ${
          (item as any).notes
            ? `<div style="font-size: 11px; font-weight: 900; color: #000; padding: 3px 6px; margin: 3px 0 3px 8px; border: 1px solid #000; background: #f0f0f0;">📝 OBS: ${(item as any).notes}</div>`
            : ""
        }
      </div>
    `;
    })
    .join("");

  const addressHtml = isPickup
    ? `
      <div style="font-weight: bold; background: #eee; padding: 4px; text-align: center; margin: 6px 0;">
        RETIRADA NO BALCÃO DA LOJA
      </div>
    `
    : `
      <div style="margin: 6px 0; font-size: 12px; line-height: 1.4;">
        <div style="font-weight: bold;">ENTREGA EM DOMICÍLIO:</div>
        <div>${order.delivery_address?.street}, ${order.delivery_address?.number}</div>
        <div>${order.delivery_address?.neighborhood || ""}${order.delivery_address?.city ? ` - ${order.delivery_address.city}` : ""}</div>
        ${order.delivery_address?.complement ? `<div>Compl: ${order.delivery_address.complement}</div>` : ""}
        ${order.delivery_address?.reference ? `<div style="font-style: italic;">Ref: ${order.delivery_address.reference}</div>` : ""}
      </div>
    `;

  const receiptHtml = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Pedido #${shortId} - Comprovante</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        @media print {
          body {
            width: 78mm;
            margin: 0 auto;
            padding: 8px;
          }
          .no-print {
            display: none !important;
          }
        }
        body {
          font-family: "Courier New", Courier, monospace;
          font-size: 12px;
          color: #000;
          background: #fff;
          width: 78mm;
          margin: 0 auto;
          padding: 10px;
          box-sizing: border-box;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        .divider {
          border-top: 1px dashed #000;
          margin: 8px 0;
        }
        .header {
          text-align: center;
          margin-bottom: 8px;
        }
        .title {
          font-size: 16px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .subtitle {
          font-size: 11px;
          margin-top: 2px;
        }
        .order-info {
          font-size: 13px;
          font-weight: bold;
          margin: 6px 0;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
          font-size: 12px;
        }
        .total-final {
          display: flex;
          justify-content: space-between;
          font-size: 15px;
          font-weight: 900;
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px solid #000;
        }
        .print-btn {
          display: block;
          width: 100%;
          background: #000;
          color: #fff;
          border: none;
          padding: 10px;
          font-size: 13px;
          font-weight: bold;
          cursor: pointer;
          border-radius: 4px;
          margin-bottom: 15px;
        }
      </style>
    </head>
    <body>
      <button class="print-btn no-print" onclick="window.print()">🖨️ Imprimir Comprovante (80mm / 58mm)</button>

      <div class="header">
        <div class="title">${storeName}</div>
        <div class="subtitle">Sorvetes, Açaí & Shakes Artesanais</div>
        <div class="divider"></div>
        <div class="order-info">COMPROVANTE DE PEDIDO #${shortId}</div>
        <div style="font-size: 11px;">Data: ${dateStr} às ${timeStr}</div>
      </div>

      <div class="divider"></div>

      <div style="font-size: 12px; line-height: 1.4;">
        <div><strong>Cliente:</strong> ${clientName}</div>
        ${phone ? `<div><strong>Tel:</strong> ${phone}</div>` : ""}
      </div>

      ${addressHtml}

      <div class="divider"></div>
      <div style="font-weight: bold; margin-bottom: 6px; text-align: center;">ITENS DO PEDIDO</div>

      ${itemsHtml}

      <div class="divider"></div>

      <div class="totals-row">
        <span>Subtotal:</span>
        <span>R$ ${formatDecimal(order.subtotal || order.total_amount)}</span>
      </div>

      ${
        order.delivery_fee && Number(order.delivery_fee) > 0
          ? `
        <div class="totals-row">
          <span>Taxa de Entrega:</span>
          <span>R$ ${formatDecimal(order.delivery_fee)}</span>
        </div>
      `
          : `
        <div class="totals-row">
          <span>Taxa de Entrega:</span>
          <span>Grátis</span>
        </div>
      `
      }

      ${
        order.discount_amount && Number(order.discount_amount) > 0
          ? `
        <div class="totals-row" style="color: #000;">
          <span>Desconto:</span>
          <span>- R$ ${formatDecimal(order.discount_amount)}</span>
        </div>
      `
          : ""
      }

      <div class="total-final">
        <span>TOTAL:</span>
        <span>R$ ${formatDecimal(order.total_amount)}</span>
      </div>

      <div class="divider"></div>

      <div style="font-size: 12px; line-height: 1.4;">
        <div><strong>Pagamento:</strong> ${paymentText}</div>
        ${
          order.payment_method_type === "dinheiro" && (order.change_for || order.payment_change_for || order.changeFor)
            ? `
          <div style="margin-top: 6px; padding: 6px; border: 2px solid #000; background: #fdfdfd; font-size: 12px; line-height: 1.5;">
            <div>Total do Pedido: R$ ${formatDecimal(order.total_amount)}</div>
            <div>Pagar com: R$ ${formatDecimal(order.change_for || order.payment_change_for || order.changeFor)}</div>
            <div style="font-weight: 900; font-size: 14px; margin-top: 4px; border-top: 1px dashed #000; padding-top: 3px;">
              LEVAR DE TROCO: R$ ${formatDecimal(
                order.change_to_return ??
                order.changeToReturn ??
                Math.max(0, Number(order.change_for || order.payment_change_for || order.changeFor) - Number(order.total_amount))
              )}
            </div>
          </div>
        `
            : ""
        }
      </div>

      <div class="divider"></div>

      <div class="text-center" style="font-size: 11px; margin-top: 10px;">
        <div>Agradecemos a preferência!</div>
        <div style="margin-top: 3px;">Bom apetite! 🍧🍨</div>
      </div>

      <script>
        window.onload = function() {
          // Auto-dispara a caixa de diálogo de impressão
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(receiptHtml);
  printWindow.document.close();
}

/**
 * Alias mantido para compatibilidade retroativa
 */
export const printThermalReceipt = printOrderReceipt;

