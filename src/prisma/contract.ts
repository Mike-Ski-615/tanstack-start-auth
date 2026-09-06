import { defineContract, enumType, member } from "@prisma/orm-postgres/contract-builder";

export const contract = defineContract({}, ({ field, model }) => {
  const Role = enumType(
    "Role",
    { codecId: "pg/text@1", nativeType: "text" },
    member("teacher"),
    member("student"),
  );

  const User = model("User", {
    fields: {
      id: field.id.uuidv7String(),
      email: field.text().unique(),
      name: field.text(),
      passwordHash: field.text(),
      image: field.text(),
      bio: field.text(),
      role: field.namedType(Role).default("student"),
      createdAt: field.temporal.createdAtString(),
      updatedAt: field.temporal.updatedAtString(),
    },
  });

  return {
    models: { User },
    enums: { Role },
  };
});
