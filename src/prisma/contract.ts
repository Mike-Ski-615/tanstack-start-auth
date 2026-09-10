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
      /**
       * 收到新通知时是否弹 toast 提醒。
       *
       * 存数据库而非 localStorage：用户可能多设备登录，偏好应当跟随账号
       * （theme 那类外观偏好存本地合理，这条是「要不要打扰我」，跨设备一致更重要）。
       */
      notifyOnNewMessage: field.boolean().default(true),
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
      // tokenHash 刻意不加 unique：OTP 只有 6 位数字（100 万种），两个用户
      // 撞到同一个码是正常的，校验时按 userId 查记录、互不影响。
      // 加全局唯一会让第二个人的注册/重置直接 500 —— 见 ADR-0006。
      tokenHash: field.text(),
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
      // 同 ResetToken：不加 unique，撞码是正常的（校验按 userId 查）—— 见 ADR-0006
      tokenHash: field.text(),
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
  // Notification / NotificationRecipient
  // ============================================================

  /**
   * 管理员发出的一次通知（批次）。
   *
   * 分两层的原因：管理员发一次、收件人可能是几百人，但「撤回这条通知」
   * 要以**发送动作**为单位。若只有收件人行，撤回就得靠 (title, createdAt)
   * 之类的软匹配，不可靠。
   *
   * createdBy 不设外键：管理员账号被删时通知应保留（那是历史记录），
   * 且 User 删除已在别处级联了 Session/Device，再加一条会扩大影响面。
   */
  const Notification = model("Notification", {
    fields: {
      id: field.id.uuidv7Native(),
      title: field.text(),
      body: field.text(),
      // 站内路径（以 / 开头），可空。允许外链会变成钓鱼入口 —— 见 ADR-0007
      link: field.text().optional(),
      // 发送者的 userId（不加外键，理由见上）
      createdBy: field.uuidNative(),
      createdAt: field.temporal.createdAtString(),
    },
  });

  /**
   * 一条通知 × 一个收件人。
   *
   * 两个人的已读/删除状态各自独立，所以状态在这里而不在 Notification 上。
   * userId 用真外键 + cascade：用户注销时他的通知自然消失。
   */
  const NotificationRecipient = model("NotificationRecipient", {
    fields: {
      id: field.id.uuidv7Native(),
      notificationId: field.uuidNative(),
      userId: field.uuidNative(),
      // null = 未读
      readAt: field.temporal.timestamptzString().optional(),
      // 用户删除单条通知时打标记而非真删 —— 只影响他自己，不动别人的副本
      deletedAt: field.temporal.timestamptzString().optional(),
      createdAt: field.temporal.createdAtString(),
    },
    relations: {
      notification: rel
        .belongsTo(Notification, { from: "notificationId", to: "id" })
        .sql({ fk: { onDelete: "cascade" } }),
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
  // 背向关系（hasMany 一律后置声明）
  // ============================================================

  // 同理：Notification 的字段类型在上方已推断完，hasMany 放到这里，
  // 避免「Cannot access 'NotificationRecipient' before initialization」。
  const Notification$ = Notification.relations({
    recipients: rel.hasMany(NotificationRecipient, { by: "notificationId" }),
  });

  // 后置声明：User 的类型在上方已独立推断完，不必在前向引用 Device/Session
  // （放进 model("User", {...}) 会造成类型互相引用 → TS7022）。
  const User$ = User.relations({
    device: rel.hasOne(Device, { by: "userId" }),
    session: rel.hasOne(Session, { by: "userId" }),
    notificationRecipients: rel.hasMany(NotificationRecipient, { by: "userId" }),
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
      Notification: Notification$,
      NotificationRecipient,
    },
    enums: {
      Role,
      DevicePlatform,
    },
  };
});
