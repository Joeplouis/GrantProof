import { connect, save, seed } from "../lib/store";
const db = connect();
save(db, seed());
db.close();
console.log(
  "Fictional GrantProof workspace reset. Expected g1 spending: $16,200; remaining: $33,800.",
);
