import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// 全局错误捕获
window.onerror = function(message, source, lineno, colno, error) {
  console.error('❌ Global error:', { message, source, lineno, colno, error })
  if (error) console.error(error.stack)
}

window.addEventListener('unhandledrejection', event => {
  console.error('❌ Unhandled promise rejection:', event.reason)
})

console.log('🚀 Starting React render...')

try {
  const root = document.getElementById('root')
  console.log('Root element:', root)
  if (!root) {
    console.error('❌ Root element not found!')
    document.body.innerHTML = '<div style="color:red;padding:20px;">Root element missing!</div>'
  } else {
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    console.log('✅ React render called')
  }
} catch (err) {
  console.error('❌ React render failed:', err)
  document.body.innerHTML = '<div style="color:red;padding:20px;">Render error: ' + err.message + '</div>'
}
