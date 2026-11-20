# Aether Wardrobe

An AI personal stylist that catalogues the clothes a family owns and dresses each person from their own wardrobe.

## People and access

**Account**:
A Google sign-in that has been granted access to the app. An Account acts; it is never dressed.
_Avoid_: user (when the person being dressed is meant)

**Person**:
Someone whose clothes are catalogued and who receives outfits. Every Account has exactly one Self Person.
_Avoid_: wearer, profile, member

**Self**:
The Person that is the Account holder themselves.

**Managed person**:
A Person with no Account of their own, such as a child or an adult without email, looked after by a Family's Managers.
_Avoid_: dependent, sub-user, child account

**Minor**:
A Person whose age band is teen, child or toddler.
_Avoid_: kid

**Family**:
The People whose wardrobes can be combined into one look, together with the Accounts that look after them.
_Avoid_: household, group, team

**Manager**:
An Account that may edit a Family's Managed people.
_Avoid_: admin (the Admin is the app-wide allowlist keeper), guardian (a legal role the app only records, never checks)

**Active person**:
The Person the wardrobe, outfit, daily, stylist and shopping views are currently about.
_Avoid_: current user

## Wardrobe

**Piece**:
One catalogued item of clothing, footwear, watch or accessory belonging to one Person.
_Avoid_: item (in prose), garment

**Outfit**:
A scored combination of one Person's Pieces: top, bottom and shoes, optionally with outerwear, a watch and accessories.
_Avoid_: combo, look (except Family look)

**Outfit table**:
All of a Person's Outfits that scored 7.0 or better. The single source of truth for every recommendation.
_Avoid_: combinations list

**Family look**:
One Outfit for each chosen Person for the same occasion, chosen to work together.
_Avoid_: group outfit, matching set

**Colour season**:
Spring, Summer, Autumn or Winter, derived from a Person's colouring; decides which colours flatter near the face.
_Avoid_: palette type
