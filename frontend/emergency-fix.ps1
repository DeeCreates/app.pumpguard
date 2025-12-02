Write-Host "🚨 EMERGENCY BUILD FIX" -ForegroundColor Red

# 1. Fix vite.config.ts
Write-Host "🔧 Fixing vite.config.ts..." -ForegroundColor Yellow
$config = @'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false
  }
})
'@
$config | Set-Content vite.config.ts -Encoding UTF8

# 2. Remove babel configs if they exist
if (Test-Path ".babelrc") {
    Rename-Item .babelrc .babelrc.backup
    Write-Host "✅ Disabled .babelrc" -ForegroundColor Green
}
if (Test-Path "babel.config.js") {
    Rename-Item babel.config.js babel.config.js.backup
    Write-Host "✅ Disabled babel.config.js" -ForegroundColor Green
}

# 3. Disable PostCSS temporarily
if (Test-Path "postcss.config.js") {
    Rename-Item postcss.config.js postcss.config.js.backup
    Write-Host "✅ Disabled PostCSS config" -ForegroundColor Green
}

# 4. Test build
Write-Host "`n🏗️  Testing build..." -ForegroundColor Cyan
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
pnpm run build:prod

if (Test-Path "dist") {
    Write-Host "`n🎉 SUCCESS! Build completed in dist/" -ForegroundColor Green
    dir dist
} else {
    Write-Host "`n❌ Build failed" -ForegroundColor Red
}