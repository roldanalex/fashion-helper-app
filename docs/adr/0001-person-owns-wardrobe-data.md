# Wardrobe data belongs to a Person, not an Account

Until 1.5.0 every Piece, Outfit, daily plan and shopping suggestion was keyed to the Account that created it. Families need to catalogue children who have no Account, so from 1.5.0 these rows carry a `person_id` and access is decided per Person (`can_edit_person` / `can_view_person`), while `user_id` stays as the Account that created the row. We considered giving each child a hidden Account (rejected: children must never sign in, and it would fake emails) and keeping everything per Account with a "for whom" label on Pieces (rejected: nothing would stop one Outfit from mixing a parent's shirt with a child's shoes).

## Consequences

- Composite foreign keys from each Outfit slot to `clothing_items(id, person_id)`, plus a trigger for `accessory_ids`, make it impossible for the database to store an Outfit that mixes People.
- Every query on wardrobe tables goes through the `Wardrobe` module (`src/lib/wardrobe`), which scopes by Person; a test fails if a direct table query appears elsewhere. This matters because 1.6.0 lets a second Account view a Family's People, and RLS alone would then leak other People's rows into each person's own pages.
- Photos of new Pieces are stored under `{uploader}/{person}/{piece}`, so they stay readable if a Managed person is later handed over to their own Account.
