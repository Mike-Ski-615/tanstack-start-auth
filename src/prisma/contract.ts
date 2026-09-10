import {
  defineContract,
  enumType,
  member,
} from "@prisma/orm-postgres/contract-builder";

export const contract = defineContract({}, ({ field, model }) => {
  // ============================================================
  // Enums
  // ============================================================

  const Role = enumType(
    "Role",
    {
      codecId: "pg/text@1",
      nativeType: "text",
    },
    member("teacher"),
    member("student"),
  );

  const OnlineStatus = enumType(
    "OnlineStatus",
    {
      codecId: "pg/text@1",
      nativeType: "text",
    },
    member("online"),
    member("offline"),
  );

  const DevicePlatform = enumType(
    "DevicePlatform",
    {
      codecId: "pg/text@1",
      nativeType: "text",
    },
    member("web"),
    member("android"),
    member("ios"),
    member("desktop"),
  );

  // ============================================================
  // User
  // ============================================================

  const User = model("User", {
    fields: {
      id: field.id.uuidv7String(),
      email: field.text().unique(),
      name: field.text(),
      passwordHash: field.text(),
      image: field.text().default("/default-user.webp").optional(),
      bio: field.text().default("这个人很懒,什么也没有留下").optional(),
      role: field.namedType(Role).default("student"),
      status: field.namedType(OnlineStatus).default("offline"),
      sessionVersion: field.int().default(0),
      emailVerifiedAt: field.temporal.timestamptzString().optional(),
      createdAt: field.temporal.createdAtString(),
      updatedAt: field.temporal.updatedAtString(),
    },
  });

  // ============================================================
  // Device
  // ============================================================

  const Device = model("Device", {
    fields: {
      id: field.id.uuidv7String(),
      userId: field.text().unique(),
      deviceKey: field.text().unique(),
      platform: field.namedType(DevicePlatform),
      name: field.text().default("Unknown Device"),
      userAgent: field.text().default(""),
      ip: field.text().default("unknown"),
      lastSeenAt: field.temporal.timestamptzString().optional(),
      createdAt: field.temporal.createdAtString(),
      updatedAt: field.temporal.updatedAtString(),
    },
  });

  // ============================================================
  // Session
  // ============================================================

  const Session = model("Session", {
    fields: {
      id: field.id.uuidv7String(),
      userId: field.text().unique(),
      deviceId: field.text().unique(),
      tokenHash: field.text().unique(),
      sessionVersion: field.int(),
      userAgent: field.text().default(""),
      ip: field.text().default("unknown"),
      createdAt: field.temporal.createdAtString(),
      updatedAt: field.temporal.updatedAtString(),
      expiresAt: field.temporal.timestamptzString(),
      revokedAt: field.temporal.timestamptzString().optional(),
    },
  });

  // ============================================================
  // ResetToken
  // ============================================================

  const ResetToken = model("ResetToken", {
    fields: {
      id: field.id.uuidv7String(),
      userId: field.text(),
      tokenHash: field.text().unique(),
      expiresAt: field.temporal.timestamptzString(),
      usedAt: field.temporal.timestamptzString().optional(),
      createdAt: field.temporal.createdAtString(),
    },
  });

  // ============================================================
  // EmailVerificationToken
  // ============================================================

  const EmailVerificationToken = model("EmailVerificationToken", {
    fields: {
      id: field.id.uuidv7String(),
      userId: field.text(),
      tokenHash: field.text().unique(),
      expiresAt: field.temporal.timestamptzString(),
      verifiedAt: field.temporal.timestamptzString().optional(),
      createdAt: field.temporal.createdAtString(),
    },
  });

  // ============================================================
  // RateLimit
  // ============================================================

  const RateLimit = model("RateLimit", {
    fields: {
      key: field.text().unique(),
      count: field.int(),
      windowStart: field.temporal.timestamptzString(),
      expiresAt: field.temporal.timestamptzString(),
    },
  });

  // ============================================================
  // Return
  // ============================================================

  return {
    models: {
      User,
      Device,
      Session,
      ResetToken,
      EmailVerificationToken,
      RateLimit,
    },
    enums: {
      Role,
      OnlineStatus,
      DevicePlatform,
    },
  };
});
