import { defineContract, enumType, member } from "@prisma/orm-postgres/contract-builder";

export const contract = defineContract({}, ({ field, model, rel }) => {
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
    member("admin"),
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
      id: field.id.uuidv7Native(),
      email: field.text().unique(),
      name: field.text(),
      passwordHash: field.text(),
      image: field.text(),
      bio: field.text(),
      role: field.namedType(Role).default("student"),
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
      id: field.id.uuidv7Native(),
      userId: field.uuidNative().unique(),
      deviceKey: field.text().unique(),
      platform: field.namedType(DevicePlatform),
      name: field.text().default("Unknown Device"),
      userAgent: field.text().default(""),
      ip: field.text().default("unknown"),
      lastSeenAt: field.temporal.timestamptzString().optional(),
      createdAt: field.temporal.createdAtString(),
      updatedAt: field.temporal.updatedAtString(),
    },
    relations: {
      user: rel.belongsTo(User, { from: "userId", to: "id" }).sql({ fk: { onDelete: "cascade" } }),
    },
  });

  // ============================================================
  // Session
  // ============================================================

  const Session = model("Session", {
    fields: {
      id: field.id.uuidv7Native(),
      userId: field.uuidNative().unique(),
      deviceId: field.uuidNative().unique(),
      tokenHash: field.text().unique(),
      sessionVersion: field.int(),
      userAgent: field.text().default(""),
      ip: field.text().default("unknown"),
      createdAt: field.temporal.createdAtString(),
      updatedAt: field.temporal.updatedAtString(),
      expiresAt: field.temporal.timestamptzString(),
      revokedAt: field.temporal.timestamptzString().optional(),
    },
    relations: {
      // 注意：deviceId -> Device.id 故意不声明 FK。
      // ensureDevice() 删旧 Device 时「不管 Session」是 CONTEXT.md 写明的设计，
      // 加了 cascade 会连带删掉旧 Session（导致 WS 踢人失效），
      // restrict 则会让 ensureDevice 的删除直接失败。
      user: rel.belongsTo(User, { from: "userId", to: "id" }).sql({ fk: { onDelete: "cascade" } }),
    },
  });

  // ============================================================
  // ResetToken
  // ============================================================

  const ResetToken = model("ResetToken", {
    fields: {
      id: field.id.uuidv7Native(),
      userId: field.uuidNative(),
      tokenHash: field.text().unique(),
      // OTP 只有 6 位数字（100 万种），必须计数错误尝试，否则可被暴力撞开
      attempts: field.int().default(0),
      expiresAt: field.temporal.timestamptzString(),
      usedAt: field.temporal.timestamptzString().optional(),
      createdAt: field.temporal.createdAtString(),
    },
    relations: {
      user: rel.belongsTo(User, { from: "userId", to: "id" }).sql({ fk: { onDelete: "cascade" } }),
    },
  });

  // ============================================================
  // EmailVerificationToken
  // ============================================================

  const EmailVerificationToken = model("EmailVerificationToken", {
    fields: {
      id: field.id.uuidv7Native(),
      userId: field.uuidNative(),
      tokenHash: field.text().unique(),
      // 同 ResetToken：6 位 OTP 需计错误尝试
      attempts: field.int().default(0),
      expiresAt: field.temporal.timestamptzString(),
      verifiedAt: field.temporal.timestamptzString().optional(),
      createdAt: field.temporal.createdAtString(),
    },
    relations: {
      user: rel.belongsTo(User, { from: "userId", to: "id" }).sql({ fk: { onDelete: "cascade" } }),
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
  // User 的背向关系
  // ============================================================

  // 后置声明：User 的类型在上方已独立推断完，不必在前向引用 Device/Session
  // （放进 model("User", {...}) 会造成类型互相引用 → TS7022）。
  const User$ = User.relations({
    device: rel.hasOne(Device, { by: "userId" }),
    session: rel.hasOne(Session, { by: "userId" }),
  });

  // ============================================================
  // Return
  // ============================================================

  return {
    models: {
      User: User$,
      Device,
      Session,
      ResetToken,
      EmailVerificationToken,
      RateLimit,
    },
    enums: {
      Role,
      DevicePlatform,
    },
  };
});
