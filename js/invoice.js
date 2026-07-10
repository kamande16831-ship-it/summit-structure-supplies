"use strict";

window.SummitInvoice = {
    downloadInvoice: openInvoiceEditor
};

function openInvoiceEditor(order) {
    const invoiceNumber =
        order.reference || `SSS-${Date.now()}`;

    const today =
        new Date().toLocaleDateString("en-GB");

    const invoiceData = {
    company: "Summit Structure Supplies",
    customerName: order.customer_name || "",
    phone: order.phone_number || "",
    address: order.delivery_location || "",
    description: order.material_type || "",
    quantity: order.quantity || "",
    unitPrice: "",
    vat: "",
    paymentMethod: "M-Pesa"
};

    const quantity =
        `${order.quantity || ""} ${order.measurement_unit || ""}`.trim();

    const unitPrice =
    Number(
        invoiceData.unitPrice.replaceAll(",", "")
    );

    const hasUnitPrice =
        Number.isFinite(unitPrice) && unitPrice > 0;

    const subtotal =
        hasUnitPrice
            ? unitPrice * Number(order.quantity || 0)
            : null;

    const vat =
    Number(
        invoiceData.vat.replaceAll(",", "")
    );

    const hasVat =
        Number.isFinite(vat) && vat > 0;

    const grandTotal =
        subtotal !== null
            ? subtotal + (hasVat ? vat : 0)
            : null;

    const pdfLines = [
        { text: "TAX INVOICE", x: 50, y: 55, size: 22, bold: true },
        { text: "Summit Structure Supplies", x: 50, y: 85, size: 14, bold: true },

        { text: `Invoice No: ${invoiceNumber}`, x: 50, y: 125, size: 11 },
        { text: `Invoice Date: ${today}`, x: 50, y: 145, size: 11 },

        { text: "Bill To", x: 50, y: 185, size: 14, bold: true },
        { text: `Customer Name: ${order.customer_name || ""}`, x: 50, y: 210, size: 11 },
        { text: `Company: ${invoiceData.company}`, x: 50, y: 230, size: 11 },
        { text: `Phone: ${order.phone_number || ""}`, x: 50, y: 250, size: 11 },
        { text: `Address: ${invoiceData.address}`, x: 50, y: 270, size: 11 },

        { text: "Description", x: 50, y: 320, size: 10, bold: true },
        { text: "Quantity", x: 245, y: 320, size: 10, bold: true },
        { text: "Unit Price (KES)", x: 335, y: 320, size: 10, bold: true },
        { text: "Total (KES)", x: 460, y: 320, size: 10, bold: true },

        { text: order.material_type || "", x: 50, y: 350, size: 10 },
        { text: quantity, x: 245, y: 350, size: 10 },
        { text: hasUnitPrice ? formatMoney(unitPrice) : "", x: 335, y: 350, size: 10 },
        { text: subtotal !== null ? formatMoney(subtotal) : "", x: 460, y: 350, size: 10 },

        { text: "Subtotal:", x: 350, y: 460, size: 11, bold: true },
        { text: subtotal !== null ? `KES ${formatMoney(subtotal)}` : "KES __________", x: 440, y: 460, size: 11 },

        { text: "VAT (if applicable):", x: 350, y: 485, size: 11, bold: true },
        { text: hasVat ? `KES ${formatMoney(vat)}` : "KES __________", x: 440, y: 485, size: 11 },

        { text: "Grand Total:", x: 350, y: 510, size: 11, bold: true },
        { text: grandTotal !== null ? `KES ${formatMoney(grandTotal)}` : "KES __________", x: 440, y: 510, size: 11 },

        { text: `Payment Method: ${invoiceData.paymentMethod}`, x: 50, y: 565, size: 11 },

        { text: "Thank you for choosing Summit Structure Supplies.", x: 50, y: 625, size: 11, bold: true },
        { text: "We appreciate your business.", x: 50, y: 645, size: 11 }
    ];

    const pdfContent =
        buildSimplePdf(pdfLines);

    showInvoicePreview(order, invoiceNumber, invoiceData);
}


function formatMoney(value) {
    return new Intl.NumberFormat(
        "en-KE",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    ).format(value);
}


function escapePdfText(value) {
    return String(value ?? "")
        .replaceAll("\\", "\\\\")
        .replaceAll("(", "\\(")
        .replaceAll(")", "\\)")
        .replaceAll("\n", " ");
}


function buildSimplePdf(lines) {
    const pageWidth = 595;
    const pageHeight = 842;

    let stream = "";

    stream += "0.8 w\n";

    // Header line
    stream += "50 735 m 545 735 l S\n";

    // Table box
    stream += "50 495 495 55 re S\n";
    stream += "50 522 m 545 522 l S\n";
    stream += "230 495 m 230 550 l S\n";
    stream += "320 495 m 320 550 l S\n";
    stream += "445 495 m 445 550 l S\n";

    for (const line of lines) {
        const font =
            line.bold
                ? "/F2"
                : "/F1";

        const y =
            pageHeight - line.y;

        stream += "BT\n";
        stream += `${font} ${line.size || 11} Tf\n`;
        stream += `${line.x} ${y} Td\n`;
        stream += `(${escapePdfText(line.text)}) Tj\n`;
        stream += "ET\n";
    }

    const objects = [];

    objects.push(
        "<< /Type /Catalog /Pages 2 0 R >>"
    );

    objects.push(
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"
    );

    objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`
    );

    objects.push(
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
    );

    objects.push(
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
    );

    objects.push(
        `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
    );

    let pdf =
        "%PDF-1.4\n";

    const offsets = [0];

    objects.forEach(function (object, index) {
        offsets.push(pdf.length);

        pdf += `${index + 1} 0 obj\n`;
        pdf += `${object}\n`;
        pdf += "endobj\n";
    });

    const xrefPosition =
        pdf.length;

    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";

    for (let index = 1; index < offsets.length; index++) {
        pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
    }

    pdf += "trailer\n";
    pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
    pdf += "startxref\n";
    pdf += `${xrefPosition}\n`;
    pdf += "%%EOF";

    return pdf;
}


function generateInvoicePdf(invoiceNumber, data) {

    const lines = [

        {
            text: "TAX INVOICE",
            x: 50,
            y: 55,
            size: 22,
            bold: true
        },

        {
            text: data.company,
            x: 50,
            y: 85,
            size: 14,
            bold: true
        },

        {
            text: `Invoice No: ${invoiceNumber}`,
            x: 50,
            y: 125,
            size: 11
        },

        {
            text: `Customer: ${data.customerName}`,
            x: 50,
            y: 170,
            size: 11
        },

        {
            text: `Phone: ${data.phone}`,
            x: 50,
            y: 190,
            size: 11
        },

        {
            text: `Address: ${data.address}`,
            x: 50,
            y: 210,
            size: 11
        },

        {
            text: `Description: ${data.description}`,
            x: 50,
            y: 260,
            size: 11
        },

        {
            text: `Quantity: ${data.quantity}`,
            x: 50,
            y: 280,
            size: 11
        },

        {
            text: `Unit Price: KES ${data.unitPrice}`,
            x: 50,
            y: 300,
            size: 11
        },

        {
            text: `VAT: KES ${data.vat}`,
            x: 50,
            y: 320,
            size: 11
        },

        {
            text: `Payment Method: ${data.paymentMethod}`,
            x: 50,
            y: 360,
            size: 11
        },

        {
            text: "Thank you for choosing Summit Structure Supplies.",
            x: 50,
            y: 430,
            size: 11,
            bold: true
        }

    ];

    return buildSimplePdf(lines);
}


function showInvoicePreview(order, invoiceNumber, data) {


    const modal =
        document.createElement("div");


    modal.style.position="fixed";
    modal.style.top="0";
    modal.style.left="0";
    modal.style.width="100%";
    modal.style.height="100%";
    modal.style.background="white";
    modal.style.zIndex="9999";
    modal.style.display="flex";
    modal.style.flexDirection="column";


    modal.innerHTML = `

    <div style="
        padding:15px;
        background:#111;
        color:white;
    ">

    <h2>
    Tax Invoice Preview
    </h2>


    <div style="
        display:grid;
        grid-template-columns:repeat(3,1fr);
        gap:10px;
    ">


    <input id="invCompany"
    value="${data.company}"
    placeholder="Company">


    <input id="invCustomer"
    value="${data.customerName}"
    placeholder="Customer name">


    <input id="invPhone"
    value="${data.phone}"
    placeholder="Phone">


    <input id="invAddress"
    value="${data.address}"
    placeholder="Address">


    <input id="invDescription"
    value="${data.description}"
    placeholder="Description">


    <input id="invQuantity"
    value="${data.quantity}"
    placeholder="Quantity">


    <input id="invPrice"
    value="${data.unitPrice}"
    placeholder="Unit price">


    <input id="invVAT"
    value="${data.vat}"
    placeholder="VAT">


    <select id="invPayment">

    <option>
    M-Pesa
    </option>

    <option>
    Cash
    </option>

    <option>
    Bank Transfer
    </option>

    </select>


    </div>


    <br>


    <button id="updateInvoice">
    Update Preview
    </button>


    <button id="downloadInvoicePdf">
    Download PDF
    </button>


    <button id="closeInvoicePreview">
    Close
    </button>


    </div>


    <iframe
    id="invoiceFrame"
    style="
    flex:1;
    border:none;
    width:100%;
    ">
    </iframe>

    `;


    document.body.appendChild(modal);



    function refreshInvoice(){

        data.company =
            document.getElementById("invCompany").value;


        data.customerName =
            document.getElementById("invCustomer").value;


        data.phone =
            document.getElementById("invPhone").value;


        data.address =
            document.getElementById("invAddress").value;


        data.description =
            document.getElementById("invDescription").value;


        data.quantity =
            document.getElementById("invQuantity").value;


        data.unitPrice =
            document.getElementById("invPrice").value;


        data.vat =
            document.getElementById("invVAT").value;


        data.paymentMethod =
            document.getElementById("invPayment").value;



        const pdf =
            generateInvoicePdf(
                invoiceNumber,
                data
            );


        const blob =
            new Blob(
                [pdf],
                {
                    type:"application/pdf"
                }
            );


        document
        .getElementById("invoiceFrame")
        .src =
        URL.createObjectURL(blob);


    }



    document
    .getElementById("updateInvoice")
    .onclick =
    refreshInvoice;



    document
    .getElementById("downloadInvoicePdf")
    .onclick =
    function(){

        const pdf =
        generateInvoicePdf(
            invoiceNumber,
            data
        );


        const blob =
        new Blob(
            [pdf],
            {
                type:"application/pdf"
            }
        );


        const link =
        document.createElement("a");


        link.href =
        URL.createObjectURL(blob);


        link.download =
        `${invoiceNumber}-tax-invoice.pdf`;


        link.click();

    };


    document
    .getElementById("closeInvoicePreview")
    .onclick =
    function(){
        modal.remove();
    };


    refreshInvoice();

}
