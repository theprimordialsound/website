const bookingDialog = document.querySelector("#booking-dialog");

if (bookingDialog) {
  setupBookingForm(bookingDialog);
}

function setupBookingForm(dialog) {
  const form = dialog.querySelector("#booking-form");
  const closeButton = dialog.querySelector(".booking-dialog__close");
  const submitButton = form.querySelector(".booking-form__submit");
  const status = form.querySelector(".booking-form__status");
  let isSubmitting = false;

  function showStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state;
  }

  document.querySelectorAll("[data-booking-open]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      if (!dialog.open) {
        dialog.showModal();
      }
    });
  });

  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    isSubmitting = true;
    submitButton.disabled = true;
    showStatus("Sending your booking request…", "pending");

    try {
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(bookingPayload(form)),
      });
      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error("The booking service returned an unreadable response.");
      }

      if (!response.ok || result?.ok !== true) {
        if (result?.error === "email_not_configured") {
          showStatus("Booking email is not configured yet. Please try again later.", "error");
        } else {
          showStatus("We couldn’t send your request right now. Please try again.", "error");
        }
        return;
      }

      form.reset();
      showStatus("Your request was sent. We’ll be in touch soon.", "success");
    } catch (error) {
      console.error("Booking request failed.", error);
      showStatus("We couldn’t send your request right now. Please try again.", "error");
    } finally {
      isSubmitting = false;
      submitButton.disabled = false;
    }
  });
}

function bookingPayload(form) {
  return {
    name: form.elements.namedItem("name").value,
    email: form.elements.namedItem("email").value,
    services: [...form.querySelectorAll('input[name="services"]:checked')].map((input) => input.value),
    message: form.elements.namedItem("message").value,
    website: form.elements.namedItem("website").value,
  };
}
