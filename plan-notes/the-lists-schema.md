
Table Name: Lists
Columns:
- Id (UUID, Primary Key)
- Title (String)
- Description (String)
- CreatedAt (Timestamp)
- UpdatedAt (Timestamp)
- Metadata (JSON/BSON)
- MessageId (UUID, Foreign Key referencing Messages.Id)


Table Name: ListProperties
Columns:
- Id (UUID, Primary Key)
- PropertyName (String)
- PropertyValue (String)
- ListId (UUID, Foreign Key referencing Lists.Id)

Second table:

Table Name: ListData
Columns:
- Id (UUID, Primary Key)
- DataValue (JSON/BSON)
- ListId (UUID, Foreign Key referencing Lists.Id)
