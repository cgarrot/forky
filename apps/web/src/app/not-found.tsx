import Link from 'next/link'

export default function NotFound() {
  return (
    <div>
      <p>Page non trouvée.</p>
      <Link href="/">Retour accueil</Link>
    </div>
  )
}
