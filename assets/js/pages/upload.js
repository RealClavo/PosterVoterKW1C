import { uploadPoster } from "../services/api-service.js";
import { getVoterId } from "../storage.js";
import { validateCreatorName, validateImageFile, validateLocation, validateTitle } from "../validation.js";
import { processImageFile } from "../utils/image-processing.js";
import { formatFileSize, getLocationLabel } from "../utils/formatting.js";
import { showToast } from "../components/toast.js";

const form = document.querySelector("[data-upload-form]");
const fileInput = document.querySelector("[data-file-input]");
const dropzone = document.querySelector("[data-dropzone]");
const preview = document.querySelector("[data-file-preview]");
const previewImage = document.querySelector("[data-preview-image]");
const fileName = document.querySelector("[data-file-name]");
const fileSize = document.querySelector("[data-file-size]");
const removeButton = document.querySelector("[data-remove-file]");
const status = document.querySelector("[data-upload-status]");
const submitButton = document.querySelector("[data-submit-button]");
const progressWrap = document.querySelector("[data-progress-wrap]");
const progressLabel = document.querySelector("[data-progress-label]");
const progressBar = document.querySelector("[data-progress-bar]");
let processedImage = null;
let previewUrl = "";
let isSubmitting = false;

function setStatus(message, type = "info") {
    status.textContent = message;
    status.dataset.type = type;
}

function setProgress(value, message) {
    progressWrap.hidden = false;
    progressBar.value = value;
    progressLabel.textContent = message;
}

function resetProgress() {
    progressWrap.hidden = true;
    progressBar.value = 0;
}

function clearPreview() {
    processedImage = null;

    if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewUrl = "";
    }

    preview.hidden = true;
    previewImage.removeAttribute("src");
    fileInput.value = "";
}

async function handleFile(file) {
    const validation = validateImageFile(file);

    if (!validation.valid) {
        setStatus(validation.message, "error");
        clearPreview();
        return;
    }

    setStatus("De afbeelding wordt verwerkt...");
    submitButton.disabled = true;

    try {
        processedImage = await processImageFile(file);

        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

        previewUrl = URL.createObjectURL(processedImage.file);
        previewImage.src = previewUrl;
        fileName.textContent = file.name;
        fileSize.textContent = `${formatFileSize(file.size)} origineel, ${formatFileSize(processedImage.size)} na verwerking`;
        preview.hidden = false;
        setStatus("De afbeelding is klaar voor upload.", "success");
    } catch (error) {
        clearPreview();
        setStatus(error.message, "error");
    } finally {
        submitButton.disabled = false;
    }
}

function getCheckedLocation() {
    return form.querySelector("input[name='location']:checked")?.value ?? "";
}

function validateForm() {
    const title = validateTitle(form.elements.title.value);
    const creator = validateCreatorName(form.elements.creatorName.value);
    const location = validateLocation(getCheckedLocation());

    if (!title.valid) {
        return title;
    }

    if (!creator.valid) {
        return creator;
    }

    if (!location.valid) {
        return location;
    }

    if (!processedImage) {
        return { valid: false, message: "Kies eerst een posterbestand." };
    }

    if (!form.elements.consent.checked) {
        return { valid: false, message: "Bevestig dat je deze poster mag uploaden." };
    }

    return {
        valid: true,
        title: title.value,
        creatorName: creator.value,
        location: location.value
    };
}

fileInput.addEventListener("change", () => {
    handleFile(fileInput.files?.[0]);
});

removeButton.addEventListener("click", () => {
    clearPreview();
    setStatus("Het bestand is verwijderd.");
});

["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.add("is-dragging");
    });
});

["dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.remove("is-dragging");
    });
});

dropzone.addEventListener("drop", (event) => {
    const file = event.dataTransfer?.files?.[0];
    handleFile(file);
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSubmitting) {
        return;
    }

    const validation = validateForm();

    if (!validation.valid) {
        setStatus(validation.message, "error");
        return;
    }

    const formData = new FormData();
    // We sturen alleen het verwerkte WebP-bestand naar de Worker; de originele bestandsnaam gaat niet mee.
    formData.append("title", validation.title);
    formData.append("creatorName", validation.creatorName);
    formData.append("location", validation.location);
    formData.append("consent", "true");
    formData.append("browserId", getVoterId());
    formData.append("turnstileToken", "");
    formData.append("website", form.elements.website.value);
    formData.append("image", processedImage.file, "poster.webp");

    isSubmitting = true;
    submitButton.disabled = true;
    setProgress(30, "Afbeelding en formulier worden gecontroleerd...");
    setStatus("De wijzigingen worden veilig opgeslagen...");

    try {
        window.setTimeout(() => setProgress(65, "De poster wordt naar de Worker verstuurd..."), 250);
        const result = await uploadPoster(formData);
        const poster = result.poster;
        const target = poster.location === "veghel" ? "./veghel.html" : "./den-bosch.html";
        const link = document.createElement("a");

        setProgress(100, "De GitHub-commit is geslaagd.");
        link.className = "text-link";
        link.href = `${target}?poster=${encodeURIComponent(poster.id)}`;
        link.textContent = `Bekijk jouw poster voor ${getLocationLabel(poster.location)}`;
        status.replaceChildren(document.createTextNode("Jouw poster is succesvol geupload. "), link);
        showToast("Jouw poster is succesvol geupload.", "success");
        form.reset();
        clearPreview();
    } catch (error) {
        setStatus(error.message, "error");
        showToast(error.message, "error");
    } finally {
        isSubmitting = false;
        submitButton.disabled = false;
        window.setTimeout(resetProgress, 1600);
    }
});
