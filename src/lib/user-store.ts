import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

export type StoredUser = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

const usersFilePath = path.join(process.cwd(), "data", "users.json");

async function readUsers(): Promise<StoredUser[]> {
  try {
    const raw = await fs.readFile(usersFilePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed as StoredUser[];
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function writeUsers(users: StoredUser[]): Promise<void> {
  await fs.mkdir(path.dirname(usersFilePath), { recursive: true });
  await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), "utf8");
}

export async function findUserByEmail(email: string): Promise<StoredUser | undefined> {
  const normalized = email.trim().toLowerCase();
  const users = await readUsers();
  return users.find((user) => user.email === normalized);
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
}): Promise<StoredUser> {
  const email = input.email.trim().toLowerCase();
  const users = await readUsers();
  if (users.some((user) => user.email === email)) {
    throw new Error("EMAIL_IN_USE");
  }

  const user: StoredUser = {
    id: randomUUID(),
    email,
    passwordHash: input.passwordHash,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  await writeUsers(users);
  return user;
}
