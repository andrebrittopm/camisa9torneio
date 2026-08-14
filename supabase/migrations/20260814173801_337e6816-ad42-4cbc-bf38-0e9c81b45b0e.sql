-- Reset da sequence via migration (executa como postgres)
SELECT setval('public.av_orders_order_seq_seq', 1, false);