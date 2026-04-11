import Swal from 'sweetalert2';

export const SweetAlertUtils = {
  success: (title: string, text?: string) => {
    return Swal.fire({
      title,
      text,
      icon: 'success',
      timer: 1500,
      timerProgressBar: true,
      showConfirmButton: false,
    });
  },

  error: (title: string, text?: string) => {
    return Swal.fire({
      title,
      text,
      icon: 'error',
      confirmButtonText: 'ตกลง',
      confirmButtonColor: '#ef4444',
    });
  },

  warning: (title: string, text?: string) => {
    return Swal.fire({
      title,
      text,
      icon: 'warning',
      confirmButtonText: 'ตกลง',
      confirmButtonColor: '#f59e0b',
    });
  },

  info: (title: string, text?: string) => {
    return Swal.fire({
      title,
      text,
      icon: 'info',
      confirmButtonText: 'ตกลง',
      confirmButtonColor: '#3b82f6',
    });
  },

  question: (title: string, text?: string) => {
    return Swal.fire({
      title,
      text,
      icon: 'question',
      confirmButtonText: 'ใช่',
      cancelButtonText: 'ไม่ใช่',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
    });
  },

  confirm: (title: string, text?: string) => {
    return Swal.fire({
      title,
      text,
      icon: 'warning',
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
    });
  },

  delete: (title: string = 'ลบข้อมูล', text: string = 'คุณแน่ใจหรือไม่ว่าต้องการลบ?') => {
    return Swal.fire({
      title,
      text,
      icon: 'warning',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
    });
  },

  loading: (title: string, text?: string) => {
    return Swal.fire({
      title,
      text,
      icon: 'info',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });
  },

  custom: (options: any) => {
    return Swal.fire({
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      ...options,
    });
  },

  successAutoClose: (title: string, text?: string, timer: number = 1500) => {
    return Swal.fire({
      title,
      text,
      icon: 'success',
      showConfirmButton: false,
      timer,
      timerProgressBar: true,
    });
  },
};
