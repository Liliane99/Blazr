"use client";

import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import io from "socket.io-client";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/sidebarBlazr";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Plus, Search, X, Palette } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

const API_URL = "http://localhost:3001";

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
  isRead: boolean;
  color?: string;
}

interface Participant {
  id: string;
  username: string;
}

interface Chat {
  id: string;
  name: string;
  participants: Participant[];
  lastMessage?: {
    content: string;
    timestamp: string;
    sender: string;
  };
}

interface User {
  id: string;
  username: string;
  color: string;
}

export default function Inbox() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [newChatName, setNewChatName] = useState("");
  const [participantTags, setParticipantTags] = useState<string[]>([]);
  const [participantInput, setParticipantInput] = useState("");
  const [participantError, setParticipantError] = useState("");
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const sendSoundRef = useRef<HTMLAudioElement | null>(null);
  const receiveSoundRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  
  const fetchMessages = useCallback(async (chatId: string) => {
    setIsLoadingMessages(true);
    try {
      const res = await fetch(`${API_URL}/messages/chat/${chatId}`, {
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
          color: msg.sender.color,
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des messages:", error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  
  const markMessagesAsRead = useCallback(async (chatId: string) => {
    try {
      await fetch(`${API_URL}/messages/markAsRead/${chatId}`, {
        method: "PATCH",
        credentials: "include",
      });
    } catch (error) {
      console.error("Erreur lors du marquage comme lu:", error);
    }
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_URL}/users/me`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          setLoading(false);
        } else {
          router.push("/");
        }
      } catch {
        router.push("/");
      }
    };
    fetchUser();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const fetchChats = async () => {
      const res = await fetch(`${API_URL}/chats/user/me`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const sortedChats = data.sort((a: Chat, b: Chat) => {
          const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
          const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
          return timeB - timeA;
        });
        setChats(sortedChats);
      }
    };
    fetchChats();
  }, [user]);

  
  useEffect(() => {
    if (!selectedChat) return;

    fetchMessages(selectedChat.id);
    markMessagesAsRead(selectedChat.id);
  }, [selectedChat, fetchMessages, markMessagesAsRead]);

  useEffect(() => {
    if (!user) return;

    socketRef.current = io(API_URL, {
      transports: ["polling", "websocket"],
    });

    const socket = socketRef.current;

    
    socket.emit("joinUser", { userId: user.id });

    
    if (selectedChat) {
      socket.emit("joinChat", {
        chatId: selectedChat.id,
        userId: user.id,
      });
    }

    
    socket.on("newMessage", (message: any) => {
      if (message.sender.username === user.username) return;

      const newMsg = {
        id: message.id.toString(),
        text: message.content,
        sender: message.sender.username,
        timestamp: message.timestamp,
        isRead: message.isRead,
        color: message.sender.color,
      };

      
      if (selectedChat && message.chatId === selectedChat.id) {
        setMessages((prev) => [...prev, newMsg]);
      }

      
      setChats((prevChats) => {
        const updatedChats = prevChats.map((chat) => {
          if (chat.id === message.chatId) {
            return {
              ...chat,
              lastMessage: {
                content: message.content,
                timestamp: message.timestamp,
                sender: message.sender.username,
              },
            };
          }
          return chat;
        });
        
        return updatedChats.sort((a, b) => {
          const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
          const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
          return timeB - timeA;
        });
      });

      receiveSoundRef.current?.play();

      
      if (selectedChat && message.chatId === selectedChat.id) {
        markMessagesAsRead(selectedChat.id);
      }
    });

    
    socket.on("messagesRead", (data: { chatId: string; readBy: string }) => {
      if (selectedChat && data.chatId === selectedChat.id) {
        setMessages((prev) => 
          prev.map(msg => 
            msg.sender === user.username 
              ? { ...msg, isRead: true }
              : msg
          )
        );
      }
    });

    
    socket.on("userColorChanged", (data: { userId: string; newColor: string; username: string }) => {
      if (data.username === user.username) {
        setUser(prev => prev ? { ...prev, color: data.newColor } : null);
      }
      
      
      setMessages((prev) => 
        prev.map(msg => 
          msg.sender === data.username 
            ? { ...msg, color: data.newColor }
            : msg
        )
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [selectedChat, user, markMessagesAsRead]);

  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim() === "" || !socketRef.current || !selectedChat || !user) return;

    const tempId = Date.now().toString();
    const timestamp = new Date().toISOString();

    socketRef.current.emit("sendMessage", {
      chatId: selectedChat.id,
      userId: user.id,
      content: newMessage,
    });

    const sentMessage = {
      id: tempId,
      text: newMessage,
      sender: user.username,
      timestamp,
      isRead: false,
      color: user.color,
    };

    setMessages((prev) => [...prev, sentMessage]);

    setChats((prevChats) => {
      const updatedChats = prevChats.map((chat) => {
        if (chat.id === selectedChat.id) {
          return {
            ...chat,
            lastMessage: {
              content: newMessage,
              timestamp,
              sender: user.username,
            },
          };
        }
        return chat;
      });
      
      return updatedChats.sort((a, b) => {
        const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
        const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
        return timeB - timeA;
      });
    });

    sendSoundRef.current?.play();
    setNewMessage("");
  };

  const addParticipantTag = (username: string) => {
    const trimmedUsername = username.trim();
    if (trimmedUsername && !participantTags.includes(trimmedUsername)) {
      setParticipantTags([...participantTags, trimmedUsername]);
      setParticipantInput("");
      setParticipantError("");
    }
  };

  const removeParticipantTag = (username: string) => {
    setParticipantTags(participantTags.filter(tag => tag !== username));
  };

  const handleParticipantInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addParticipantTag(participantInput);
    } else if (e.key === "Backspace" && participantInput === "" && participantTags.length > 0) {
      removeParticipantTag(participantTags[participantTags.length - 1]);
    }
  };

  const handleCreateChat = async () => {
    if (!newChatName.trim()) return;
    
    setParticipantError("");
    
    const res = await fetch(`${API_URL}/chats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: newChatName.trim(),
        participantUsernames: participantTags,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      if (res.status === 404 && errorData.message?.includes("utilisateur")) {
        setParticipantError("Un ou plusieurs participants n'existent pas");
      } else {
        setParticipantError("Erreur lors de la création du chat");
      }
      return;
    }

    const data = await res.json();
    setChats((prev) => [data, ...prev]);
    setNewChatName("");
    setParticipantTags([]);
    setParticipantInput("");
    setParticipantError("");
    setOpen(false);
  };

  const handleColorChange = async (newColor: string) => {
    if (!user) return;
    
    try {
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
        
        
        if (socketRef.current) {
          socketRef.current.emit("userColorChanged", {
            userId: user.id,
            newColor: newColor,
            username: user.username
          });
        }
      }
    } catch (error) {
      console.error("Erreur lors du changement de couleur:", error);
    }
  };

  const getOtherParticipants = (chat: Chat) =>
    chat.participants.filter((p) => p.username !== user?.username);

  const filteredChats = chats.filter((chat) => {
    const otherNames = getOtherParticipants(chat)
      .map((p) => p.username.toLowerCase())
      .join(" ");
    return (
      chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      otherNames.includes(searchTerm.toLowerCase())
    );
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Hier';
    } else {
      return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    }
  };

  const truncateMessage = (message: string, maxLength: number = 50) => {
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
  };

 
  const getContrastColor = (bgColor: string) => {
    
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
    setMessages([]); 
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500 text-lg">
        Chargement...
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 text-gray-900">
      <audio ref={sendSoundRef} src="/send.mp3" preload="auto" />
      <audio ref={receiveSoundRef} src="/receive.mp3" preload="auto" />

      <div className="w-16 shrink-0 bg-white border-r">
        <AppSidebar />
      </div>

      <ResizablePanelGroup direction="horizontal" className="flex-1 flex h-full">
        <ResizablePanel defaultSize={30} minSize={20} className="flex flex-col bg-white border-r shadow-sm">
          <div className="p-5 flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold tracking-wide">Conversations de {user?.username}</h2>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="hover:bg-indigo-100"
                    aria-label="Nouvelle conversation"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Nouvelle conversation</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="chatName">Nom de la conversation</Label>
                      <Input
                        id="chatName"
                        value={newChatName}
                        onChange={(e) => setNewChatName(e.target.value)}
                        placeholder="Ex: Projet équipe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="participants">Participants</Label>
                      <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[2.5rem] focus-within:ring-2 focus-within:ring-indigo-500">
                        {participantTags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                            {tag}
                          </Badge>
                        ))}
                        <Input
                          id="participants"
                          value={participantInput}
                          onChange={(e) => setParticipantInput(e.target.value)}
                          onKeyDown={handleParticipantInputKeyDown}
                          onBlur={() => {
                            if (participantInput.trim()) {
                              addParticipantTag(participantInput);
                            }
                          }}
                          placeholder={participantTags.length === 0 ? "Tapez un nom d'utilisateur..." : ""}
                          className="border-0 shadow-none p-0 h-auto focus-visible:ring-0 flex-1 min-w-[120px]"
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        Appuyez sur Entrée ou virgule pour ajouter un participant
                      </p>
                      {participantError && (
                        <p className="text-sm text-red-500">{participantError}</p>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateChat} className="w-full">
                      Créer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="mb-4 relative">
              <input
                type="search"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Recherche de conversations"
              />
              <Search className="absolute top-2.5 left-3 text-gray-400" size={18} />
            </div>

            <ul className="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-indigo-300 scrollbar-track-gray-100">
              {filteredChats.length === 0 && (
                <li className="text-gray-400 text-center mt-10">Aucune conversation trouvée</li>
              )}
              {filteredChats.map((chat) => (
                <li
                  key={chat.id}
                  onClick={() => handleChatSelect(chat)}
                  className={`cursor-pointer p-3 rounded-lg shadow-sm transition-colors
                    ${
                      selectedChat?.id === chat.id
                        ? "bg-indigo-100 font-semibold"
                        : "bg-white hover:bg-indigo-50"
                    }`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleChatSelect(chat);
                    }
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="text-indigo-700 font-medium truncate">
                      {chat.name}
                      </div>
                      {chat.lastMessage && (
                        <div className="text-xs text-gray-400 truncate mt-1">
                          <span className="font-medium">
                            {chat.lastMessage.sender === user?.username ? "Vous" : chat.lastMessage.sender}:
                          </span>{" "}
                          {truncateMessage(chat.lastMessage.content, 30)}
                        </div>
                      )}
                    </div>
                    {chat.lastMessage && (
                      <div className="text-xs text-gray-400 ml-2 flex-shrink-0">
                        {formatTime(chat.lastMessage.timestamp)}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {user && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Palette className="w-4 h-4 text-gray-600" />
                  <Label htmlFor="color" className="text-sm font-medium">Ma couleur :</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="color"
                      value={user.color}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="w-8 h-8 border-2 border-white rounded-full shadow-md cursor-pointer"
                      aria-label="Choisir la couleur des messages"
                    />
                    <div 
                      className="px-3 py-1 rounded-full text-xs font-medium shadow-sm"
                      style={{ 
                        backgroundColor: user.color,
                        color: getContrastColor(user.color)
                      }}
                    >
                      Aperçu
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle className="bg-gray-200 hover:bg-indigo-300 cursor-col-resize" />

        <ResizablePanel defaultSize={70} minSize={40} className="flex flex-col bg-white">
          {selectedChat ? (
            <>
              <header className="border-b p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h2 className="text-2xl font-bold">Bienvenue sur : {selectedChat.name}</h2>
                </div>
              </header>

              <main
                className="flex-1 overflow-y-auto px-6 py-4 space-y-3 scrollbar-thin scrollbar-thumb-indigo-300 scrollbar-track-gray-100"
                aria-live="polite"
                aria-relevant="additions"
              >
                {isLoadingMessages && (
                  <div className="flex justify-center items-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                    <span className="ml-2 text-gray-500">Chargement des messages...</span>
                  </div>
                )}
                
                {messages.map((msg) => {
                  const isMe = msg.sender === user?.username;
                  const bgColor = isMe ? user?.color : msg.color || "#e5e7eb";
                  const textColor = getContrastColor(bgColor);
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className="max-w-sm px-4 py-3 rounded-2xl text-sm break-words shadow-sm"
                        style={{
                          backgroundColor: bgColor,
                          color: textColor,
                        }}
                        role="article"
                        aria-label={`${msg.sender} à ${new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      >
                        {!isMe && (
                          <div className="mb-2 font-semibold text-xs opacity-90 border-b border-current border-opacity-20 pb-1">
                            {msg.sender}
                          </div>
                        )}
                        <div className="leading-relaxed">{msg.text}</div>
                        <div className="mt-2 text-xs opacity-75 flex justify-between items-center">
                          <time dateTime={msg.timestamp}>
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </time>
                          {isMe && (
                            <span className="ml-2 italic text-xs">
                              {msg.isRead ? "Lu" : "Distribué"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </main>

              <footer className="p-5 border-t flex items-center gap-3">
                <textarea
                  rows={1}
                  placeholder="Écrire un message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="flex-grow resize-none rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Écrire un message"
                />
                <Button onClick={handleSend} className="whitespace-nowrap">
                  Envoyer
                </Button>
              </footer>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 italic text-lg">
              Sélectionnez une conversation pour discuter
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}