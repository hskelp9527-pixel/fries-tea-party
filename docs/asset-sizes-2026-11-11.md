# Asset compression, 2026-11-11

All 63 optimized GLBs were decoded and inspected after writing. Original files are retained. Geometry uses Meshopt; textures use WebP, capped at 1024 pixels for actors and 384 for props. Model texture allocation (RGBA8 with mipmaps): 137.1 MiB. Runtime buffers and render targets are measured separately.

Models: 114,393,428 -> 14,714,252 bytes. Speech: 26,652,810 -> 2,792,532 bytes.

There are 137 source WAVs. The diagnosis counted both Vite URL-module requests and their media requests as 274 WAVs. This table lists every actual source, once.

## Models

| File | Source bytes | Optimized bytes | Reduction |
|---|---:|---:|---:|
| armchair.glb | 2378756 | 168304 | 92.9% |
| big_tree.glb | 3246404 | 338800 | 89.6% |
| blue_teacup.glb | 308036 | 39044 | 87.3% |
| blue_teapot.glb | 1718168 | 128548 | 92.5% |
| book_page.glb | 20756 | 6788 | 67.3% |
| book_stack.glb | 30444 | 13116 | 56.9% |
| butter.glb | 23292 | 9796 | 57.9% |
| cake.glb | 23448 | 5252 | 77.6% |
| cake_stand.glb | 1822616 | 159820 | 91.2% |
| clock_hand.glb | 5136 | 2840 | 44.7% |
| cupcake.glb | 32704 | 7724 | 76.4% |
| dormouse.glb | 9350948 | 1687296 | 82.0% |
| fountain.glb | 2379528 | 201684 | 91.5% |
| fries.glb | 9725788 | 2093156 | 78.5% |
| fruit_tart.glb | 64404 | 14044 | 78.2% |
| gear.glb | 95416 | 25192 | 73.6% |
| hanging_clock.glb | 1931824 | 130904 | 93.2% |
| hare.glb | 10459372 | 2407872 | 77.0% |
| hat.glb | 1936752 | 82488 | 95.7% |
| hatter.glb | 30069876 | 3306692 | 89.0% |
| hat_rack.glb | 2340464 | 143424 | 93.9% |
| house.glb | 3385872 | 264280 | 92.2% |
| jam_jar.glb | 31768 | 12844 | 59.6% |
| kit/candelabra.glb | 27052 | 11684 | 56.8% |
| kit/candle.glb | 15924 | 9736 | 38.9% |
| kit/far_tree.glb | 36772 | 12980 | 64.7% |
| kit/fence_broken.glb | 197812 | 14856 | 92.5% |
| kit/fence_picket.glb | 206216 | 16988 | 91.8% |
| kit/flagstone_a.glb | 367912 | 50808 | 86.2% |
| kit/flagstone_b.glb | 367912 | 50808 | 86.2% |
| kit/flagstone_c.glb | 367916 | 50804 | 86.2% |
| kit/flagstone_d.glb | 367916 | 50808 | 86.2% |
| kit/flower_daisy.glb | 93432 | 16872 | 81.9% |
| kit/flower_forget_me_not.glb | 77568 | 15216 | 80.4% |
| kit/flower_foxglove.glb | 63080 | 10460 | 83.4% |
| kit/flower_mallow.glb | 47284 | 10388 | 78.0% |
| kit/flower_pink_rose.glb | 56172 | 13476 | 76.0% |
| kit/flower_red_rose.glb | 56168 | 13428 | 76.1% |
| kit/flower_violets.glb | 36008 | 8948 | 75.1% |
| kit/heart_arch.glb | 1370592 | 145068 | 89.4% |
| kit/ivy_strand.glb | 339580 | 40524 | 88.1% |
| kit/long_table.glb | 5179772 | 490200 | 90.5% |
| kit/long_table_dressed.glb | 8065676 | 961940 | 88.1% |
| kit/milk_jug.glb | 276532 | 45800 | 83.4% |
| kit/rose_arch.glb | 1256652 | 112236 | 91.1% |
| kit/steps_stone.glb | 1160132 | 88476 | 92.4% |
| kit/wall_cap_flowers.glb | 1131752 | 75824 | 93.3% |
| kit/wall_stone.glb | 458152 | 63824 | 86.1% |
| lantern.glb | 1697360 | 129408 | 92.4% |
| macarons.glb | 102600 | 20632 | 79.9% |
| pink_teacup.glb | 300084 | 51732 | 82.8% |
| pink_teapot.glb | 1440460 | 116508 | 91.9% |
| plate.glb | 263668 | 25648 | 90.3% |
| pocket_watch.glb | 2030528 | 97184 | 95.2% |
| porch.glb | 2025648 | 324900 | 84.0% |
| saucer.glb | 263676 | 25164 | 90.5% |
| spoon.glb | 31564 | 4372 | 86.1% |
| sugar_bowl.glb | 96632 | 22648 | 76.6% |
| teacup.glb | 300084 | 37692 | 87.4% |
| teapot.glb | 371436 | 65308 | 82.4% |
| tea_tray.glb | 81148 | 19996 | 75.4% |
| tree_door.glb | 2240728 | 120508 | 94.6% |
| whole_cake.glb | 142056 | 20492 | 85.6% |

## Dialogue

| File | Source bytes | Optimized bytes | Reduction |
|---|---:|---:|---:|
| BK-01_hatter.wav | 156090 | 16453 | 89.5% |
| BK-02_hare.wav | 131130 | 13999 | 89.3% |
| BK-03_hatter.wav | 154170 | 16485 | 89.3% |
| BK-04_hare.wav | 179130 | 20753 | 88.4% |
| BK-05_hatter.wav | 211770 | 22220 | 89.5% |
| BK-06_hare.wav | 182970 | 19107 | 89.6% |
| BK-07_hatter.wav | 152250 | 15972 | 89.5% |
| BK-08_hare.wav | 221370 | 22858 | 89.7% |
| BK-09_hare.wav | 186810 | 19139 | 89.8% |
| BK-10_hatter.wav | 190650 | 20007 | 89.5% |
| BK-11_hare.wav | 159930 | 16558 | 89.6% |
| BK-12_hatter.wav | 202170 | 23589 | 88.3% |
| BK-13_hare.wav | 177210 | 18068 | 89.8% |
| BT-01_hatter.wav | 102330 | 10789 | 89.5% |
| BT-02_hare.wav | 46650 | 4542 | 90.3% |
| BT-03_hatter.wav | 230970 | 24529 | 89.4% |
| BT-04_hare.wav | 113850 | 12507 | 89.0% |
| BT-05_hatter.wav | 227130 | 23923 | 89.5% |
| BT-06_hatter.wav | 248250 | 25632 | 89.7% |
| BT-07_hare.wav | 110010 | 11761 | 89.3% |
| BT-08_hatter.wav | 507450 | 53685 | 89.4% |
| BT-09_hare.wav | 81210 | 8491 | 89.5% |
| BT-10_hatter.wav | 182970 | 19286 | 89.5% |
| BT-11_hatter.wav | 169530 | 19292 | 88.6% |
| BT-12_hare.wav | 146490 | 15334 | 89.5% |
| BT-13_dormouse.wav | 392250 | 40901 | 89.6% |
| BT-14_hatter.wav | 305850 | 32358 | 89.4% |
| BT-15_hare.wav | 303930 | 34835 | 88.5% |
| BT-16_dormouse.wav | 459450 | 47097 | 89.7% |
| BT-17_hatter.wav | 125370 | 13051 | 89.6% |
| BT-18_hatter.wav | 117690 | 12392 | 89.5% |
| BT-19_hare.wav | 136890 | 13895 | 89.8% |
| BT-20_dormouse.wav | 495930 | 50291 | 89.9% |
| BT-21_hatter.wav | 133050 | 14253 | 89.3% |
| BT-22_dormouse.wav | 557370 | 57699 | 89.6% |
| BT-23_hare.wav | 73530 | 7430 | 89.9% |
| BT-24_dormouse.wav | 303930 | 30796 | 89.9% |
| BT-25_dormouse.wav | 398010 | 41927 | 89.5% |
| BT-26_hare.wav | 100410 | 9814 | 90.2% |
| BT-27_hatter.wav | 54330 | 5900 | 89.1% |
| BT-28_dormouse.wav | 634170 | 65767 | 89.6% |
| BT-29_hatter.wav | 200250 | 21246 | 89.4% |
| BT-30_hare.wav | 113850 | 12058 | 89.4% |
| BT-31_hatter.wav | 102330 | 10962 | 89.3% |
| BT-32_hare.wav | 200250 | 21167 | 89.4% |
| BT-33_hatter.wav | 133050 | 13994 | 89.5% |
| BT-34_hare.wav | 152250 | 15712 | 89.7% |
| BT-35_hatter.wav | 169530 | 17847 | 89.5% |
| BT-36_hare.wav | 117690 | 12232 | 89.6% |
| BT-37_hatter.wav | 104250 | 10439 | 90.0% |
| BT-38_hare.wav | 158010 | 16355 | 89.6% |
| BT-39_hatter.wav | 100410 | 10816 | 89.2% |
| BT-40_hare.wav | 111930 | 11422 | 89.8% |
| BT-41_dormouse.wav | 148410 | 17330 | 88.3% |
| BT-42_hare.wav | 73530 | 7837 | 89.3% |
| BT-43_hatter.wav | 181050 | 18966 | 89.5% |
| BT-44_hare.wav | 79290 | 8253 | 89.6% |
| BT-45_hare.wav | 79290 | 8337 | 89.5% |
| BT-46_hatter.wav | 206010 | 21966 | 89.3% |
| BT-47_hare.wav | 173370 | 17237 | 90.1% |
| BT-48_hatter.wav | 188730 | 19633 | 89.6% |
| BT-49_hare.wav | 83130 | 8753 | 89.5% |
| BT-50_hatter.wav | 152250 | 15830 | 89.6% |
| BT-51_dormouse.wav | 204090 | 20940 | 89.7% |
| BT-52_hare.wav | 148410 | 14965 | 89.9% |
| BT-53_hatter.wav | 127290 | 13650 | 89.3% |
| BT-54_hare.wav | 69690 | 7289 | 89.5% |
| BT-55_fries.wav | 181050 | 18917 | 89.6% |
| BT-56_hatter.wav | 240570 | 25759 | 89.3% |
| BT-57_hatter.wav | 79290 | 8281 | 89.6% |
| BT-58_fries.wav | 194490 | 19577 | 89.9% |
| BT-59_hatter.wav | 108090 | 11476 | 89.4% |
| BT-60_hare.wav | 54330 | 5591 | 89.7% |
| BT-61_fries.wav | 236730 | 24765 | 89.5% |
| BT-62_hatter.wav | 302010 | 31644 | 89.5% |
| BT-63_fries.wav | 98490 | 10074 | 89.8% |
| BT-64_hatter.wav | 213690 | 22629 | 89.4% |
| BT-65_fries.wav | 246330 | 25250 | 89.7% |
| BT-66_hatter.wav | 175290 | 18747 | 89.3% |
| ED-01_hatter.wav | 181050 | 19167 | 89.4% |
| ED-02_hare.wav | 182970 | 19275 | 89.5% |
| ED-03_dormouse.wav | 250170 | 25902 | 89.6% |
| ED-04_fries.wav | 133050 | 13282 | 90.0% |
| ED-05_hatter.wav | 200250 | 20995 | 89.5% |
| ED-06_hare.wav | 173370 | 17895 | 89.7% |
| ED-07_fries.wav | 123450 | 12939 | 89.5% |
| ED-08_hatter.wav | 140730 | 15025 | 89.3% |
| EX-01_dormouse.wav | 230970 | 22838 | 90.1% |
| EX-02_dormouse.wav | 449850 | 45601 | 89.9% |
| EX-03_dormouse.wav | 373050 | 38122 | 89.8% |
| EX-04_dormouse.wav | 261690 | 27799 | 89.4% |
| EX-05_dormouse.wav | 359610 | 35872 | 90.0% |
| EX-06_dormouse.wav | 407610 | 42003 | 89.7% |
| EX-07_dormouse.wav | 298170 | 31102 | 89.6% |
| EX-08_dormouse.wav | 336570 | 35162 | 89.6% |
| EX-09_dormouse.wav | 348090 | 38483 | 88.9% |
| EX-10_dormouse.wav | 461370 | 45019 | 90.2% |
| GR-01_hare.wav | 154170 | 15439 | 90.0% |
| GR-02_hatter.wav | 156090 | 16449 | 89.5% |
| GR-03_hare.wav | 177210 | 18658 | 89.5% |
| GR-04_fries.wav | 108090 | 11294 | 89.6% |
| OP-01_hatter.wav | 138810 | 15628 | 88.7% |
| OP-02_hare.wav | 92730 | 9232 | 90.0% |
| OP-03_fries.wav | 133050 | 13485 | 89.9% |
| OP-04_hatter.wav | 211770 | 22938 | 89.2% |
| OP-05_hatter.wav | 136890 | 14384 | 89.5% |
| OP-06_fries.wav | 144570 | 15012 | 89.6% |
| OP-07_hatter.wav | 159930 | 16500 | 89.7% |
| OP-08_hare.wav | 184890 | 20839 | 88.7% |
| OP-09_hatter.wav | 136890 | 14668 | 89.3% |
| OP-10_dormouse.wav | 398010 | 40566 | 89.8% |
| SG-01_hatter.wav | 217530 | 23030 | 89.4% |
| SG-02_hare.wav | 179130 | 18564 | 89.6% |
| SG-03_fries.wav | 77370 | 7922 | 89.8% |
| SG-04_dormouse.wav | 380730 | 42981 | 88.7% |
| SG-05_hare.wav | 188730 | 19435 | 89.7% |
| SG-06_hatter.wav | 175290 | 18608 | 89.4% |
| ST-01_hatter.wav | 123450 | 12955 | 89.5% |
| ST-02_fries.wav | 196410 | 20059 | 89.8% |
| ST-03_hatter.wav | 173370 | 18181 | 89.5% |
| ST-04_hare.wav | 159930 | 16272 | 89.8% |
| ST-05_fries.wav | 121530 | 12574 | 89.7% |
| ST-06_hare.wav | 196410 | 20576 | 89.5% |
| ST-07_hatter.wav | 129210 | 13692 | 89.4% |
| ST-08_fries.wav | 140730 | 14495 | 89.7% |
| ST-09_hatter.wav | 206010 | 21739 | 89.4% |
| ST-10_hatter.wav | 184890 | 19409 | 89.5% |
| ST-11_fries.wav | 121530 | 12819 | 89.5% |
| ST-12_hare.wav | 81210 | 8341 | 89.7% |
| SZ-01_hatter.wav | 136890 | 14518 | 89.4% |
| SZ-02_hare.wav | 127290 | 13383 | 89.5% |
| SZ-03_hatter.wav | 184890 | 19327 | 89.5% |
| SZ-04_hare.wav | 131130 | 13788 | 89.5% |
| SZ-05_hare.wav | 184890 | 19483 | 89.5% |
| SZ-06_dormouse.wav | 419130 | 44821 | 89.3% |
| SZ-07_hatter.wav | 186810 | 19089 | 89.8% |
| SZ-08_hare.wav | 209850 | 23567 | 88.8% |

## Selected music

| File | Source bytes | Optimized bytes | Reduction |
|---|---:|---:|---:|
| audio/01t_opening_b.mp3 | 883065 | 421617 | 52.3% |
| audio/02t_explore_frozen_b.mp3 | 2704641 | 1431198 | 47.1% |
| audio/03t_explore_awake_a.mp3 | 2852409 | 1388655 | 51.3% |
| audio/04t_little_bat_a.mp3 | 1705737 | 784663 | 54.0% |
| audio/06t_ending_a.mp3 | 514665 | 303640 | 41.0% |
