"use client"

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
import { Eye, EyeOff } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function Home() {
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [checkingAuth, setCheckingAuth] = useState(true)

  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("http://localhost:3001/auth/me", {
          credentials: "include",
        })
        if (res.ok) {
          router.replace("/inbox")
          return
        } else {
          setCheckingAuth(false)
        }
      } catch (err) {
        setCheckingAuth(false)
      }
    }
    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    try {
      const res = await fetch("http://localhost:3001/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Erreur de connexion")
      }

      router.push("/inbox")
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (checkingAuth) {
    return <div className="text-center mt-10">Chargement...</div>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-image p-4">
      <div className="flex flex-col items-center w-full max-w-md">
        <h1 className="blazr-logo text-4xl mb-4 text-center">
          {["B", "l", "a", "z", "r"].map((letter, index) => (
            <span key={index} className="blazr-letter">{letter}</span>
          ))}
        </h1>
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Connexion</CardTitle>
            <CardDescription className="text-center">
              Pas encore inscrit ?{" "}
              <Link
                href="/register"
                className="hover:underline"
                style={{ color: "oklch(38% 0.189 293.745)" }}
              >
                Créez votre compte
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="username" className="mb-1">Pseudo</Label>
                  <Input
                    id="username"
                    placeholder="Votre pseudo"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="mb-1">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      placeholder="Votre mot de passe"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      aria-label="Afficher le mot de passe"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <div className="text-right mt-2">
                    <Link
                      href="/forgot-password"
                      className="text-sm hover:underline"
                      style={{ color: "oklch(38% 0.189 293.745)" }}
                    >
                      Mot de passe oublié ?
                    </Link>
                  </div>
                </div>
              </div>
              {error && (
                <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
              )}
              <CardFooter className="px-0 pb-0 pt-4">
                <Button variant="outline" className="w-full" type="submit">
                  Connexion
                </Button>
              </CardFooter>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
