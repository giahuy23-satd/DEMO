/* ===== RSVP.JS — RSVP form handling ===== */

(function() {
  document.addEventListener('DOMContentLoaded', () => {
    const modal   = document.getElementById('rsvp-modal');
    const submit  = document.getElementById('btn-rsvp-submit');
    const cancel  = document.getElementById('btn-rsvp-cancel');
    const nameEl  = document.getElementById('rsvp-name');
    const emailEl = document.getElementById('rsvp-email');
    const phoneEl = document.getElementById('rsvp-phone');
    const msgEl   = document.getElementById('rsvp-message');

    cancel.addEventListener('click', () => {
      modal.classList.remove('visible');
    });

    submit.addEventListener('click', async () => {
      const name = nameEl.value.trim();
      if (!name) {
        Utils.notify('⚠ Please enter your name!');
        nameEl.focus();
        return;
      }

      submit.textContent = 'SENDING...';
      submit.disabled = true;

      try {
        const res = await fetch('/api/rsvp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email: emailEl.value.trim(),
            phone: phoneEl.value.trim(),
            message: msgEl.value.trim(),
            status: 'attending',
          }),
        });
        const data = await res.json();

        if (data.success) {
          modal.classList.remove('visible');
          Utils.notify('✓ RSVP CONFIRMED! See you there!');
          // Clear form
          nameEl.value = '';
          emailEl.value = '';
          phoneEl.value = '';
          msgEl.value = '';

          // Show final question screen after short delay
          setTimeout(async () => {
            await Story.showFinalQuestion();
          }, 1600);
        } else {
          Utils.notify('⚠ ' + (data.error || 'Something went wrong.'));
        }
      } catch (err) {
        Utils.notify('⚠ Connection error. Please try again.');
      } finally {
        submit.textContent = 'CONFIRM ✓';
        submit.disabled = false;
      }
    });

    // Allow Enter key in name field
    nameEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit.click();
    });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('visible');
    });
  });
})();
