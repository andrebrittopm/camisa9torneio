[
  {
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.av_cleanup_rate_limit_buckets(p_limit integer DEFAULT 500)\n RETURNS integer\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''\nAS $function$\nDECLARE\n    v_count INTEGER;\nBEGIN\n    WITH to_delete AS (\n        SELECT bucket_key_hash \n        FROM public.av_rate_limit_buckets\n        WHERE expires_at \u003c clock_timestamp()\n        LIMIT p_limit\n        FOR UPDATE SKIP LOCKED\n    )\n    DELETE FROM public.av_rate_limit_buckets\n    WHERE bucket_key_hash IN (SELECT bucket_key_hash FROM to_delete);\n    \n    GET DIAGNOSTICS v_count = ROW_COUNT;\n    RETURN v_count;\nEND;\n$function$\n"
  }
]
