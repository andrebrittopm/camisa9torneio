import os

files_to_consolidate = [
    ("A_rate_limit_helper_after.ts", ".lovable/etapa-3.3b-2b-r1/A_rate_limit_helper_after.ts"),
    ("B_server_route_after.ts", ".lovable/etapa-3.3b-2b-r1/B_server_route_after.ts"),
    ("C_tests_RLSRV26_RLSRV33.md", ".lovable/etapa-3.3b-2b-r1/C_tests_RLSRV26_RLSRV33.md"),
    ("D_matrix_RLSRV01_RLSRV25_corrected.md", ".lovable/etapa-3.3b-2b-r1/D_matrix_RLSRV01_RLSRV25_corrected.md"),
    ("E_final_audit.md", ".lovable/etapa-3.3b-2b-r1/E_final_audit.md"),
]

output_file = "AUDITORIA_FINAL_3_3B_2B_R1.txt"

with open(output_file, "w") as outfile:
    for header, path in files_to_consolidate:
        outfile.write(f"===== {header} =====\n")
        if os.path.exists(path):
            with open(path, "r") as infile:
                outfile.write(infile.read())
        else:
            outfile.write(f"ERROR: File {path} not found.\n")
        outfile.write("\n\n")

print(f"Successfully consolidated into {output_file}")
