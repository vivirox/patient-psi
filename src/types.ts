export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified?: Date;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Patient {
  id: string;
  userId: string;
  name: string;
  type: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Chat {
  id: string;
  patientId: string;
  userId: string;
  title: string;
  shared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  chatId: string;
  role: string;
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
