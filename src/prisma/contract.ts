import { defineContract } from "@prisma/orm-postgres/contract-builder";

export const contract = defineContract({}, ({ field, model, rel }) => {
  const User = model("User", {
    fields: {
      id: field.id.uuidv7String(),
      email: field.text().unique(),
      name: field.text(),
      passwordHash: field.text(),
      image: field.text(),
      bio: field.text(),
      createdAt: field.temporal.createdAtString(),
      updatedAt: field.temporal.updatedAtString(),
    },
  });

  const Token = model("Token", {
    fields: {
      id: field.id.uuidv7String(),
      tokenHash: field.text().unique(),
      purpose: field.text(),
      userId: field.uuidString(),
      expiresAt: field.temporal.timestamptzString(),
      lastSentAt: field.temporal.timestamptzString(),
      createdAt: field.temporal.createdAtString(),
      updatedAt: field.temporal.updatedAtString(),
    },
  });

  return {
    models: {
      User: User.relations({
        tokens: rel.hasMany(Token, {
          by: "userId",
        }),
      }),
      Token: Token.relations({
        user: rel
          .belongsTo(User, {
            from: "userId",
            to: "id",
          })
          .sql({
            fk: {
              onDelete: "cascade",
            },
          }),
      }),
    },
  };
});
