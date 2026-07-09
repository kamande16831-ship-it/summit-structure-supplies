"use strict";

document.addEventListener(
    "DOMContentLoaded",
    loadPublicPaymentMethod
);


async function loadPublicPaymentMethod() {
    const section =
        document.getElementById(
            "publicPaymentSection"
        );

    const card =
        document.getElementById(
            "publicPaymentCard"
        );

    if (!section || !card) {
        return;
    }

    if (
        !window.supabase ||
        !window.SUMMIT_SUPABASE_URL ||
        !window.SUMMIT_SUPABASE_KEY
    ) {
        return;
    }

    const paymentDatabase =
        window.supabase.createClient(
            window.SUMMIT_SUPABASE_URL,
            window.SUMMIT_SUPABASE_KEY
        );

    const result =
        await paymentDatabase
            .from("payment_settings")
            .select(
                `
                    payment_name,
                    payment_type,
                    primary_label,
                    primary_value,
                    secondary_label,
                    secondary_value,
                    recipient_name,
                    instructions,
                    is_active
                `
            )
            .eq("is_active", true)
            .limit(1);

    /* Payment load failures are hidden from public visitors. */
    if (
        result.error ||
        !Array.isArray(result.data) ||
        result.data.length === 0
    ) {
        section.classList.add("hidden");
        return;
    }

    const payment =
        result.data[0];

    card.innerHTML = `
        <div class="public-payment-logo">
            <span>M</span>
        </div>

        <div class="public-payment-details">

            <p class="public-payment-type">
                ${escapePaymentHtml(payment.payment_type)}
            </p>

            <h3>
                ${escapePaymentHtml(payment.payment_name)}
            </h3>

            <dl class="public-payment-list">

                <div>
                    <dt>
                        ${escapePaymentHtml(payment.primary_label)}
                    </dt>

                    <dd>
                        ${escapePaymentHtml(payment.primary_value)}
                    </dd>
                </div>

                ${
                    payment.secondary_label ||
                    payment.secondary_value
                        ? `
                            <div>
                                <dt>
                                    ${escapePaymentHtml(
                                        payment.secondary_label || ""
                                    )}
                                </dt>

                                <dd>
                                    ${escapePaymentHtml(
                                        payment.secondary_value || ""
                                    )}
                                </dd>
                            </div>
                        `
                        : ""
                }

                ${
                    payment.recipient_name
                        ? `
                            <div>
                                <dt>Recipient</dt>

                                <dd>
                                    ${escapePaymentHtml(
                                        payment.recipient_name
                                    )}
                                </dd>
                            </div>
                        `
                        : ""
                }

            </dl>

            ${
                payment.instructions
                    ? `
                        <div class="public-payment-instructions">
                            <h4>How to Pay</h4>

                            <p>
                                ${escapePaymentHtml(
                                    payment.instructions
                                )}
                            </p>
                        </div>
                    `
                    : ""
            }

            <p class="payment-safety-message">
                Confirm the recipient name before completing payment.
            </p>

        </div>
    `;

    section.classList.remove("hidden");
}


function escapePaymentHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
