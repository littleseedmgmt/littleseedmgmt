# Teacher Photo Mapping

This file maps extracted photo files to teacher names for database import.

## Peter Pan Harbor Bay (HB) - 8 Photos

| File | Label from Photo | Full Name | Role | Classroom |
|------|------------------|-----------|------|-----------|
| `HB/teacher_1.png` | Ms. Antionia (HB Twos) | Anotnia Ortiz | Teacher | Grasshoppers (2s) |
| `HB/teacher_2.png` | Ms. Melody (HB Infant Aide) | Melody Chan | Teacher Assistant | Ladybugs (Infant) |
| `HB/teacher_3.png` | Ms. Jennie (HB Pre-K) | Jennie Mendoza | Teacher | Dragonflies (4-5) |
| `HB/teacher_4.png` | Ms. Kirsten (HB Lead Infant) | Kirsten Cesar | Lead Teacher | Ladybugs (Infant) |
| `HB/teacher_5.png` | Ms. Lois (HB Pre-K) | Lois Steenhard | Teacher | Dragonflies (4-5) |
| `HB/teacher_6.png` | Ms. Thao (HB Infant Teacher) | Thao Ho | Teacher | Ladybugs (Infant) |
| `HB/teacher_7.png` | Ms. Theresa (HB Director) | Theresa Clement | Director | - |
| `HB/teacher_8.png` | Ms. Vynn (HB Threes Lead) | Vynn Alcontin | Teacher | Butterflies (3s) |

---

## Peter Pan Mariner Square (MS) - 18 Photos

| File | Label from Photo | Full Name | Role | Classroom |
|------|------------------|-----------|------|-----------|
| `MS/teacher_1.png` | Mr. Kevin (MS Pre-K Teacher) | Kevin Dupre | Teacher | Soda Pop (Pre-K) |
| `MS/teacher_2.png` | Ms. Cora (MS Twos Teacher) | Corazon Velasquez | Teacher | Tigers (2s) |
| `MS/teacher_3.png` | Ms. Jules (MS Pre-K) | Jules Leung | Teacher | Soda Pop (Pre-K) |
| `MS/teacher_4.png` | Ms. Mackeshia (MS Infant) | Macekshia Stevenson | Teacher Assistant | Caterpillars (Infant) |
| `MS/teacher_5.png` | Ms. Maricon (Twos Teacher) | Maricon Alcontin | Teacher Assistant | Tigers (2s) |
| `MS/teacher_6.png` | Ms. Muoi (MS Twos Teacher) | Muoi Tran | Teacher Assistant | Tigers (2s) |
| `MS/teacher_7.png` | Ms. Sally (MS Infant Teacher) | Sally Du | Teacher | Tadpoles (Infant) |
| `MS/teacher_8.png` | Ms. Shannon (MS Assistant) | Shannon Atthowe | Assistant Director | - |
| `MS/teacher_9.png` | Ms. Shelly (MS Infant Aide) | Shelly Ortiz | Teacher Assistant | Tadpoles (Infant) |
| `MS/teacher_10.png` | Ms. Sherry (MS Infant) | Sherry Chan | Teacher | Tadpoles (Infant) |
| `MS/teacher_11.png` | Ms. Shirley (MS Threes) | Shirley Liu | Teacher | Ponies (3s) |
| `MS/teacher_12.png` | Ms. Tiffany (MS Floater) | Tiffany Louie | Floater | Cross-school |
| `MS/teacher_13.png` | Ms. Aura (Floater for 3...) | Aura Batres | Floater | - |
| `MS/teacher_14.png` | Ms. Christina (MS Lead Pre-K) | Christina Sagun | Lead Teacher | Soda Pop (Pre-K) |
| `MS/teacher_15.png` | Ms. Izzy (MS Infant Teacher) | Isabel Kasaab | Teacher Assistant | Caterpillars (Infant) |
| `MS/teacher_16.png` | Ms. Julie (MS Director) | Julie DeMauri | Director | - |
| `MS/teacher_17.png` | Ms. Pat (MS Infant Teacher) | Pat Adkins | Lead Infant Teacher | Caterpillars (Infant) |
| `MS/teacher_18.png` | Ms. Angel (MS Lead) | Angel Lewis | Lead Teacher | Ponies (3s) |

**Note**: Mariner Square has **two floaters**:
- **Aura Batres** - Floater primarily within MS
- **Tiffany Louie** - Cross-school floater (MS-based, but covers LS and HB as needed)

---

## Little Seeds Children's Center (LS) - 6 Photos

| File | Label from Photo | Full Name | Role | Classroom |
|------|------------------|-----------|------|-----------|
| `LS/teacher_1.png` | Ms. Kristy (LS Lead Twos) | Kristy Meli | Teacher | Bunnies (2s) |
| `LS/teacher_2.png` | Ms. Mona (LS Lead Pre-K) | Mona Watson | Teacher | Bears (4-5) |
| `LS/teacher_3.png` | Ms. Quyen (LS Twos Teacher) | Quyen Duong | Teacher Assistant | Bunnies (2s) |
| `LS/teacher_4.png` | Ms. Sarah (LS Director) | Sarah Hallford | Director | - |
| `LS/teacher_5.png` | Ms. Sonia (LS Threes Lead) | Sonia Hernandez | Teacher | Chipmunks (3s) |
| `LS/teacher_6.png` | Ms. Tam (Infant Aide) | Tam Tran | Teacher Assistant | Squirrels (Infant) |

### Missing Photos for Little Seeds:
- **Judi Thach** - Lead Infant Teacher (Squirrels)
- **Tiffany Louie** - Floater (may be mislabeled in MS folder as teacher_12.png)

---

## Summary

| School | Photos | Staff Listed | Missing |
|--------|--------|--------------|---------|
| Harbor Bay | 8 | 9 | Theresa only has "Varies" lunch |
| Mariner Square | 18 | 17 | 1 extra (possibly Tiffany mislabeled) |
| Little Seeds | 6 | 8 | Judi Thach, Tiffany Louie |

---

## JSON Export for Database Import

```json
{
  "harbor_bay": [
    {"file": "HB/teacher_1.png", "first_name": "Anotnia", "last_name": "Ortiz", "role": "teacher"},
    {"file": "HB/teacher_2.png", "first_name": "Melody", "last_name": "Chan", "role": "assistant"},
    {"file": "HB/teacher_3.png", "first_name": "Jennie", "last_name": "Mendoza", "role": "teacher"},
    {"file": "HB/teacher_4.png", "first_name": "Kirsten", "last_name": "Cesar", "role": "lead_teacher"},
    {"file": "HB/teacher_5.png", "first_name": "Lois", "last_name": "Steenhard", "role": "teacher"},
    {"file": "HB/teacher_6.png", "first_name": "Thao", "last_name": "Ho", "role": "teacher"},
    {"file": "HB/teacher_7.png", "first_name": "Theresa", "last_name": "Clement", "role": "director"},
    {"file": "HB/teacher_8.png", "first_name": "Vynn", "last_name": "Alcontin", "role": "teacher"}
  ],
  "mariner_square": [
    {"file": "MS/teacher_1.png", "first_name": "Kevin", "last_name": "Dupre", "role": "teacher"},
    {"file": "MS/teacher_2.png", "first_name": "Corazon", "last_name": "Velasquez", "role": "teacher"},
    {"file": "MS/teacher_3.png", "first_name": "Jules", "last_name": "Leung", "role": "teacher"},
    {"file": "MS/teacher_4.png", "first_name": "Macekshia", "last_name": "Stevenson", "role": "assistant"},
    {"file": "MS/teacher_5.png", "first_name": "Maricon", "last_name": "Alcontin", "role": "assistant"},
    {"file": "MS/teacher_6.png", "first_name": "Muoi", "last_name": "Tran", "role": "assistant"},
    {"file": "MS/teacher_7.png", "first_name": "Sally", "last_name": "Du", "role": "teacher"},
    {"file": "MS/teacher_8.png", "first_name": "Shannon", "last_name": "Atthowe", "role": "assistant_director"},
    {"file": "MS/teacher_9.png", "first_name": "Shelly", "last_name": "Ortiz", "role": "assistant"},
    {"file": "MS/teacher_10.png", "first_name": "Sherry", "last_name": "Chan", "role": "teacher"},
    {"file": "MS/teacher_11.png", "first_name": "Shirley", "last_name": "Liu", "role": "teacher"},
    {"file": "MS/teacher_13.png", "first_name": "Aura", "last_name": "Batres", "role": "floater"},
    {"file": "MS/teacher_14.png", "first_name": "Christina", "last_name": "Sagun", "role": "lead_teacher"},
    {"file": "MS/teacher_15.png", "first_name": "Isabel", "last_name": "Kasaab", "role": "assistant"},
    {"file": "MS/teacher_16.png", "first_name": "Julie", "last_name": "DeMauri", "role": "director"},
    {"file": "MS/teacher_17.png", "first_name": "Pat", "last_name": "Adkins", "role": "lead_teacher"},
    {"file": "MS/teacher_18.png", "first_name": "Angel", "last_name": "Lewis", "role": "lead_teacher"}
  ],
  "little_seeds": [
    {"file": "LS/teacher_1.png", "first_name": "Kristy", "last_name": "Meli", "role": "teacher"},
    {"file": "LS/teacher_2.png", "first_name": "Mona", "last_name": "Watson", "role": "teacher"},
    {"file": "LS/teacher_3.png", "first_name": "Quyen", "last_name": "Duong", "role": "assistant"},
    {"file": "LS/teacher_4.png", "first_name": "Sarah", "last_name": "Hallford", "role": "director"},
    {"file": "LS/teacher_5.png", "first_name": "Sonia", "last_name": "Hernandez", "role": "teacher"},
    {"file": "LS/teacher_6.png", "first_name": "Tam", "last_name": "Tran", "role": "assistant"}
  ]
}
```

---

## Recommended File Renaming

For easier identification, photos could be renamed to:

```
HB/anotnia_ortiz.png
HB/melody_chan.png
HB/jennie_mendoza.png
...etc
```

Or stored in Supabase Storage with the teacher UUID as the filename.
