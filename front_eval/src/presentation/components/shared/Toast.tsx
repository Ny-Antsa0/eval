type ToastProps = {
  message: string
  tone?: 'success' | 'error'
}

const Toast = ({ message, tone = 'success' }: ToastProps) => {
  return <div className={`toast toast-${tone}`}>{message}</div>
}

export default Toast
