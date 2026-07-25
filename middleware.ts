export { proxy as middleware } from './src/proxy'

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|logo.png|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.gif$).*)',
  ],
}
