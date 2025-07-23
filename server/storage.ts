import { users, addresses, type User, type InsertUser, type Address, type InsertAddress } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createAddress(address: InsertAddress): Promise<Address>;
  getAddresses(): Promise<Address[]>;
  getAddressById(id: number): Promise<Address | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private addresses: Map<number, Address>;
  currentUserId: number;
  currentAddressId: number;

  constructor() {
    this.users = new Map();
    this.addresses = new Map();
    this.currentUserId = 1;
    this.currentAddressId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createAddress(insertAddress: InsertAddress): Promise<Address> {
    const id = this.currentAddressId++;
    const address: Address = { ...insertAddress, id, userId: null };
    this.addresses.set(id, address);
    return address;
  }

  async getAddresses(): Promise<Address[]> {
    return Array.from(this.addresses.values());
  }

  async getAddressById(id: number): Promise<Address | undefined> {
    return this.addresses.get(id);
  }
}

export const storage = new MemStorage();
