"use client";

import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { AppSidebar } from "@/components/sidebarBlazr";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const API_URL = "http://localhost:3001";

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
  isRead: boolean;
}

interface Participant {
  id: string;
  username: string;
}

interface Chat {
  id: string;
  name: string;
  participants: Participant[];
}

interface User {
  id: string;
  username: string;
  color: string;
}

export default function Inbox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [newChatName, setNewChatName] = useState("");
  const [newChatParticipants, setNewChatParticipants] = useState("");
  const [open, setOpen] = useState(false);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const sendSoundRef = useRef<HTMLAudioElement | null>(null);
  const receiveSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const res = await fetch(`${API_URL}/users/me`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchChats = async () => {
      const res = await fetch(`${API_URL}/chats/user/me`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    };
    fetchChats();
  }, [user]);

  useEffect(() => {
    if (!selectedChat) return;

    const fetchMessages = async () => {
      const res = await fetch(`${API_URL}/messages/chat/${selectedChat.id}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const formattedMessages = data.map((msg: any) => ({
          id: msg.id.toString(),
          text: msg.content,
          sender: msg.sender?.username || "unknown",
          timestamp: msg.timestamp,
          isRead: msg.isRead,
        }));
        setMessages(formattedMessages);
      }
    };

    fetchMessages();

    const markAsRead = async () => {
      await fetch(`${API_URL}/messages/markAsRead/${selectedChat.id}`, {
        method: "PATCH",
        credentials: "include",
      });
    };

    markAsRead();
  }, [selectedChat]);

  useEffect(() => {
    if (!selectedChat || !user) return;

    socketRef.current = io(API_URL, {
      transports: ["polling", "websocket"],
    });

    const socket = socketRef.current;

    socket.emit("joinChat", {
      chatId: selectedChat.id,
      userId: user.id,
    });

    socket.on("newMessage", (message: any) => {
      if (message.sender.username === user.username) return;

      setMessages((prev) => [
        ...prev,
        {
          id: message.id.toString(),
          text: message.content,
          sender: message.sender.username,
          timestamp: message.timestamp,
          isRead: message.isRead,
        },
      ]);

      receiveSoundRef.current?.play();

      fetch(`${API_URL}/messages/markAsRead/${selectedChat.id}`, {
        method: "PATCH",
        credentials: "include",
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [selectedChat, user]);

  const handleSend = () => {
    if (newMessage.trim() === "" || !socketRef.current || !selectedChat || !user) return;

    const tempId = Date.now().toString();

    socketRef.current.emit("sendMessage", {
      chatId: selectedChat.id,
      userId: user.id,
      content: newMessage,
    });

    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        text: newMessage,
        sender: user.username,
        timestamp: new Date().toISOString(),
        isRead: false,
      },
    ]);

    sendSoundRef.current?.play();
    setNewMessage("");
  };

  const handleCreateChat = async () => {
    const res = await fetch(`${API_URL}/chats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: newChatName,
        participantUsernames: newChatParticipants.split(",").map((u) => u.trim()),
      }),
    });

    if (!res.ok) return;

    const data = await res.json();
    setChats((prev) => [...prev, data]);
    setNewChatName("");
    setNewChatParticipants("");
    setOpen(false);
  };

  const getOtherParticipants = (chat: Chat) =>
    chat.participants.filter((p) => p.username !== user?.username);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 🔊 Sons */}
      <audio ref={sendSoundRef} src="/send.mp3" preload="auto" />
      <audio ref={receiveSoundRef} src="/receive.mp3" preload="auto" />

      <div className="w-16 shrink-0">
        <AppSidebar />
      </div>

      <ResizablePanelGroup direction="horizontal" className="flex-1 h-full">
        <ResizablePanel defaultSize={30} minSize={20}>
          <div className="h-full border-r bg-gray-50 p-4 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold">Conversations de {user?.username}</h2>
                {user && (
                  <div className="mt-2">
                    <label htmlFor="color" className="text-sm text-gray-600">
                      Couleur de vos messages :
                    </label>
                    <input
                      type="color"
                      id="color"
                      value={user.color}
                      onChange={async (e) => {
                        const newColor = e.target.value;
                        const res = await fetch(`${API_URL}/users/me`, {
                          method: "PATCH",
                          headers: {
                            "Content-Type": "application/json", 
                          },
                          credentials: "include",
                          body: JSON.stringify({ color: newColor }),
                        });
                        if (res.ok) {
                          const updatedUser = await res.json();
                          setUser(updatedUser);
                        }
                      }}
                      className="ml-2 h-6 w-10 p-0 border-0 bg-transparent"
                    />
                  </div>
                )}
              </div>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost">
                    <Plus className="w-5 h-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nouvelle conversation</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nom de la conversation</Label>
                      <Input
                        value={newChatName}
                        onChange={(e) => setNewChatName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Participants (usernames séparés par virgules)</Label>
                      <Input
                        value={newChatParticipants}
                        onChange={(e) => setNewChatParticipants(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateChat}>Créer</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <ul className="space-y-2">
              {Array.isArray(chats) &&
                chats.map((chat) => (
                  <li
                    key={chat.id}
                    onClick={() => {
                      setSelectedChat(chat);
                      setMessages([]);
                    }}
                    className="p-3 rounded-md bg-white hover:bg-gray-100 cursor-pointer shadow-sm"
                  >
                    <div className="font-medium">
                      {getOtherParticipants(chat)
                        .map((p) => p.username)
                        .join(", ")}
                    </div>
                    <div className="text-sm text-gray-500">{chat.name}</div>
                  </li>
                ))}
            </ul>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={70} minSize={40}>
          <div className="h-full bg-white p-6 flex flex-col">
            {selectedChat ? (
              <>
                <div className="border-b pb-4 mb-4 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold">{selectedChat.name}</h2>
                    <p className="text-sm text-gray-500">
                      Avec :{" "}
                      {selectedChat.participants.map((p) => p.username).join(", ")}
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 flex flex-col">
                  {messages.map((msg) => {
                    const isMe = msg.sender === user?.username;
                    return (
                      <div
                        key={msg.id}
                        className={`max-w-xs p-3 rounded-md text-sm ${
                          isMe ? "self-end text-right" : "self-start bg-gray-100"
                        }`}
                        style={isMe ? { backgroundColor: user?.color || "#000000" } : {}}
                      >
                        {!isMe && (
                          <div className="text-xs text-gray-500 mb-1">
                            {msg.sender}
                          </div>
                        )}
                        <div>{msg.text}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          {isMe && (
                            <span className="ml-2">
                              {msg.isRead ? "Lu" : "Distribué"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    placeholder="Écrire un message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-grow border rounded-md p-2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSend();
                    }}
                  />
                  <Button onClick={handleSend}>Envoyer</Button>
                </div>
              </>
            ) : (
              <p>Sélectionnez une conversation pour discuter</p>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
