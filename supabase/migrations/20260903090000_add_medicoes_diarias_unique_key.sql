-- Permite atualizar o mesmo lançamento ao salvar novamente a planilha.
CREATE UNIQUE INDEX IF NOT EXISTS medicoes_diarias_contrato_equipamento_data_key
ON public.medicoes_diarias (contrato, equipamento, data);