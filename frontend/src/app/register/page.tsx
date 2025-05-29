'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import Link from "next/link"

export default function Register() {
  const [showPassword] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSuccessMessage('')
    setErrorMessage('')

    const form = e.currentTarget
    const pseudo = (form.querySelector('#pseudo') as HTMLInputElement).value
    const password = (form.querySelector('#password') as HTMLInputElement).value
    const confirm = (form.querySelector('#password-confirmation') as HTMLInputElement).value

    if (password !== confirm) {
      setErrorMessage("Les mots de passe ne correspondent pas.")
      return
    }

    try {
      const res = await fetch('http://localhost:3001/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: pseudo, password }),
      })

      if (res.ok) {
        setSuccessMessage("Inscription réussie. Veuillez vous connecter.")
        form.reset()
      } else {
        const data = await res.json()
        setErrorMessage(data.message || "Une erreur est survenue.")
      }
    } catch {
      setErrorMessage("Impossible de contacter le serveur.")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-image p-4">
      <div className="flex flex-col items-center">
        <h1 className="blazr-logo">
          {["B", "l", "a", "z", "r"].map((letter, index) => (
            <span key={index} className="blazr-letter">{letter}</span>
          ))}
        </h1>
        <Card className="w-[480px]">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Inscription</CardTitle>
            <CardDescription className="text-center">
              Déjà inscrit ?{" "}
              <Link
                href="/"
                className="hover:underline"
                style={{ color: "oklch(38% 0.189 293.745)" }}
              >
                Connexion
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="pseudo" className="mb-1">Pseudo</Label>
                  <Input id="pseudo" placeholder="Liam02" type="text" required />
                </div>
                <div>
                  <Label htmlFor="password" className="mb-1">Mot de passe</Label>
                  <Input
                    id="password"
                    placeholder="Votre mot de passe"
                    type={showPassword ? "text" : "password"}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password-confirmation" className="mb-1">Confirmation du mot de passe</Label>
                  <Input
                    id="password-confirmation"
                    placeholder="Confirmer votre mot de passe"
                    type={showPassword ? "text" : "password"}
                    required
                  />
                </div>
              </div>
              {successMessage && (
                <p className="text-green-600 text-sm mt-4 text-center">{successMessage}</p>
              )}
              {errorMessage && (
                <p className="text-red-600 text-sm mt-4 text-center">{errorMessage}</p>
              )}
              <CardFooter className="px-0 pt-6">
                <Button variant="outline" className="w-full" type="submit">
                  S'inscrire
                </Button>
              </CardFooter>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
