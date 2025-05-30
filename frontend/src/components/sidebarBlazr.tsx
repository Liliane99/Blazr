"use client"

import {
  Inbox,
  LogOut
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider
} from "@/components/ui/sidebar"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()  

    try {
      await fetch("http://localhost:3001/auth/logout", {
        method: "POST",
        credentials: "include",
      })

      router.push("/")
    } catch (error) {
      console.error("Erreur lors de la déconnexion", error)
    }
  }

  const menuItems = [
    {
      icon: Inbox,
      url: "/inbox",
      title: "Inbox",
      onClick: null,
    },
    {
      icon: LogOut,
      url: null,
      title: "Logout",
      onClick: handleLogout,
    },
  ]

  return (
    <SidebarProvider>
      <Sidebar className="w-16 flex flex-col justify-between border-r bg-white">
        <div className="flex flex-col items-center gap-6 mt-6">
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>

          <SidebarContent className="flex flex-col items-center gap-6 mt-8">
            <SidebarMenu>
              {menuItems.map((item, i) => {
                const isActive = pathname === item.url
                return (
                  <SidebarMenuItem key={i}>
                    <SidebarMenuButton asChild>
                      {item.onClick ? (
                        <button
                          onClick={item.onClick}
                          title={item.title}
                          className="p-2 rounded-md text-black hover:bg-gray-100"
                        >
                          <item.icon size={24} />
                        </button>
                      ) : (
                        <Link
                          href={item.url!}
                          title={item.title}
                          className={`p-2 rounded-md ${
                            isActive
                              ? "text-[oklch(38%_0.189_293.745)]"
                              : "text-black"
                          } hover:bg-gray-100`}
                        >
                          <item.icon size={24} />
                        </Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarContent>
        </div>
      </Sidebar>
    </SidebarProvider>
  )
}
