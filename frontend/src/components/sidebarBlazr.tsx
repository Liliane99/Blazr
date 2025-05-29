"use client"

import {
  Search,
  Inbox,
  Ghost,
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
import Link from "next/link"
import { usePathname } from "next/navigation"

const menuItems = [
  {
    icon: Inbox,
    url: "/inbox",
    title: "Inbox",
  },
  {
    icon: LogOut,
    url: "/logout",
    title: "Logout",
  },
]

export function AppSidebar() {
  const pathname = usePathname()

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
                      <Link
                        href={item.url}
                        title={item.title}
                        className={`p-2 rounded-md ${
                          isActive
                            ? "text-[oklch(38%_0.189_293.745)]"
                            : "text-black"
                        } hover:bg-gray-100`}
                      >
                        <item.icon size={24} />
                      </Link>
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
