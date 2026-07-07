"use strict";

let publicMaterialsDatabase = null;
let publicMaterials = [];


document.addEventListener(
    "DOMContentLoaded",
    initializePublicMaterials
);


async function initializePublicMaterials() {
    if (
        !window.supabase ||
        !window.SUMMIT_SUPABASE_URL ||
        !window.SUMMIT_SUPABASE_KEY
    ) {
        showPublicMessage(
            "The materials catalogue could not connect to the database.",
            true
        );

        return;
    }

    publicMaterialsDatabase =
        window.supabase.createClient(
            window.SUMMIT_SUPABASE_URL,
            window.SUMMIT_SUPABASE_KEY
        );

    document
        .getElementById("publicMaterialSearch")
        .addEventListener(
            "input",
            displayFilteredPublicMaterials
        );

    await loadPublicMaterials();
}


/*
=========================================
LOAD ACTIVE MATERIALS
=========================================
*/

async function loadPublicMaterials() {
    showPublicMessage(
        "Loading materials...",
        false
    );

    const result = await publicMaterialsDatabase
        .from("materials")
        .select(
            `
                id,
                material_name,
                material_type,
                availability_status,
                price,
                price_unit,
                description,
                updated_at
            `
        )
        .eq("is_active", true)
        .order("material_name", {
            ascending: true
        })
        .order("material_type", {
            ascending: true
        });

    if (result.error) {
        console.error(
            "Materials could not be loaded:",
            result.error
        );

        showPublicMessage(
            `Materials could not be loaded: ${result.error.message}`,
            true
        );

        return;
    }

    publicMaterials =
        Array.isArray(result.data)
            ? result.data
            : [];

    displayFilteredPublicMaterials();
}


/*
=========================================
SEARCH MATERIALS
=========================================
*/

function displayFilteredPublicMaterials() {
    const searchValue = document
        .getElementById("publicMaterialSearch")
        .value
        .trim()
        .toLowerCase();

    const filteredMaterials =
        publicMaterials.filter(function (material) {
            const searchableText = [
                material.material_name,
                material.material_type,
                material.availability_status,
                material.price_unit,
                material.description
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchableText.includes(
                searchValue
            );
        });

    renderGroupedMaterials(filteredMaterials);
}


/*
=========================================
GROUP MATERIALS BY CATEGORY
=========================================
*/

function groupMaterialsByCategory(materials) {
    const groupedMaterials = new Map();

    materials.forEach(function (material) {
        const category =
            material.material_name.trim();

        if (!groupedMaterials.has(category)) {
            groupedMaterials.set(
                category,
                []
            );
        }

        groupedMaterials
            .get(category)
            .push(material);
    });

    return groupedMaterials;
}


/*
=========================================
DISPLAY GROUPED MATERIALS
=========================================
*/

function renderGroupedMaterials(materials) {
    const message =
        document.getElementById(
            "publicMaterialsMessage"
        );

    const groupsContainer =
        document.getElementById(
            "publicMaterialsGroups"
        );

    groupsContainer.innerHTML = "";

    if (materials.length === 0) {
        groupsContainer.classList.add("hidden");

        message.classList.remove("hidden");
        message.classList.remove(
            "registry-error"
        );

        message.textContent =
            "No construction materials match your search.";

        return;
    }

    message.classList.add("hidden");
    groupsContainer.classList.remove("hidden");

    const groupedMaterials =
        groupMaterialsByCategory(materials);

    groupedMaterials.forEach(
        function (categoryMaterials, categoryName) {
            groupsContainer.appendChild(
                createMaterialCategory(
                    categoryName,
                    categoryMaterials
                )
            );
        }
    );
}


function createMaterialCategory(
    categoryName,
    categoryMaterials
) {
    const categorySection =
        document.createElement("section");

    categorySection.className =
        "material-category-group";

    const typeWord =
        categoryMaterials.length === 1
            ? "type"
            : "types";

    categorySection.innerHTML = `
        <div class="material-category-heading">
            <div>
                <p class="material-category-label">
                    Construction material
                </p>

                <h3>
                    ${escapeMaterialHtml(categoryName)}
                </h3>
            </div>

            <span class="material-type-count">
                ${categoryMaterials.length}
                ${typeWord}
            </span>
        </div>

        <div class="material-category-table-wrapper">
            <table class="materials-registry-table grouped-materials-table">
                <thead>
                    <tr>
                        <th>Brand / Type</th>
                        <th>Availability</th>
                        <th>Price</th>
                        <th>Pricing Unit</th>
                        <th>Description</th>
                    </tr>
                </thead>

                <tbody>
                    ${categoryMaterials
                        .map(createMaterialTypeRow)
                        .join("")}
                </tbody>
            </table>
        </div>
    `;

    return categorySection;
}


function createMaterialTypeRow(material) {
    return `
        <tr>
            <td>
                <strong class="material-brand-name">
                    ${escapeMaterialHtml(
                        material.material_type
                    )}
                </strong>
            </td>

            <td>
                <span class="
                    availability-badge
                    ${availabilityClass(
                        material.availability_status
                    )}
                ">
                    ${escapeMaterialHtml(
                        material.availability_status
                    )}
                </span>
            </td>

            <td class="material-price">
                ${formatKenyaCurrency(
                    material.price
                )}
            </td>

            <td>
                ${escapeMaterialHtml(
                    material.price_unit
                )}
            </td>

            <td class="material-description-cell">
                ${escapeMaterialHtml(
                    material.description ||
                    "No additional description"
                )}
            </td>
        </tr>
    `;
}


/*
=========================================
MESSAGES AND HELPERS
=========================================
*/

function showPublicMessage(
    message,
    isError
) {
    const messageElement =
        document.getElementById(
            "publicMaterialsMessage"
        );

    const groupsContainer =
        document.getElementById(
            "publicMaterialsGroups"
        );

    messageElement.textContent = message;
    messageElement.classList.remove("hidden");

    messageElement.classList.toggle(
        "registry-error",
        isError
    );

    groupsContainer.classList.add("hidden");
}


function availabilityClass(status) {
    return String(status)
        .toLowerCase()
        .replaceAll(" ", "-");
}


function formatKenyaCurrency(value) {
    return new Intl.NumberFormat(
        "en-KE",
        {
            style: "currency",
            currency: "KES",
            minimumFractionDigits: 2
        }
    ).format(Number(value));
}


function escapeMaterialHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
