import Swal from 'sweetalert2';

interface ConfirmOptions {
  title: string;
  text?: string;
  confirmText: string;
  cancelText?: string;
  /** Destructive actions get a red button and focus starts on "cancel". */
  danger?: boolean;
}

/**
 * Asks the user to confirm an action in a dialog styled like the rest of the app.
 * Resolves to true only when the user clicks the confirm button.
 */
export async function confirmAction({ title, text, confirmText, cancelText = 'Voltar', danger = false }: ConfirmOptions) {
  const result = await Swal.fire({
    title,
    text,
    icon: danger ? 'warning' : 'question',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
    focusCancel: danger,
    buttonsStyling: false,
    customClass: {
      popup: 'app-swal',
      icon: 'app-swal-icon',
      title: 'app-swal-title',
      htmlContainer: 'app-swal-text',
      actions: 'app-swal-actions',
      confirmButton: `btn ${danger ? 'app-swal-danger' : 'btn-primary'}`,
      cancelButton: 'btn btn-secondary',
    },
  });
  return result.isConfirmed;
}
