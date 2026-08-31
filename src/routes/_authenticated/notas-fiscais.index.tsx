{/* TABELA DE NOTAS FISCAIS COMPACTA */}
      <div className="w-full overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs">
        <table className="w-full min-w-[1350px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
              <th className="w-[65px] px-2 py-2.5 text-left font-semibold">NF</th>
              <th className="min-w-[160px] px-3 py-2.5 text-left font-semibold">Fornecedor</th>
              <th className="min-w-[110px] px-3 py-2.5 text-left font-semibold">Equipamento</th>
              <th className="w-[50px] px-1 py-2.5 text-center font-semibold">CL</th>
              <th className="w-[85px] px-2 py-2.5 text-left font-semibold">Emissão</th>
              <th className="w-[95px] px-2 py-2.5 text-right font-semibold">Valor</th>
              <th className="min-w-[130px] px-2 py-2.5 text-left font-semibold">Descrição</th>
              <th className="w-[80px] px-2 py-2.5 text-left font-semibold">Venc. 01</th>
              <th className="w-[80px] px-2 py-2.5 text-left font-semibold">Venc. 02</th>
              <th className="w-[80px] px-2 py-2.5 text-left font-semibold">Venc. 03</th>
              <th className="min-w-[110px] px-2 py-2.5 text-left font-semibold">Observação</th>
              <th className="w-[75px] px-2 py-2.5 text-center font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={12} className="text-center py-6 text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-slate-400" />
                  Carregando notas fiscais...
                </td>
              </tr>
            ) : notasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={12} className="text-center py-6 text-slate-500">
                  Nenhuma nota fiscal encontrada.
                </td>
              </tr>
            ) : (
              notasFiltradas.map((nota) => (
                <tr key={nota.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-2 py-2.5 font-medium text-slate-950 truncate max-w-[65px]" title={nota.nf}>
                    {nota.nf}
                  </td>
                  <td className="px-3 py-2.5 font-medium text-slate-900 truncate max-w-[160px]" title={nota.fornecedor}>
                    {nota.fornecedor}
                  </td>
                  <td className="px-3 py-2.5 truncate max-w-[110px]" title={nota.identificacao}>
                    {nota.identificacao}
                  </td>
                  <td className="px-1 py-2.5 text-center">{nota.cl}</td>
                  <td className="px-2 py-2.5">{formatDate(nota.data)}</td>
                  <td className="px-2 py-2.5 text-right font-medium">{formatBRL(nota.valor)}</td>
                  <td className="px-2 py-2.5 truncate max-w-[130px]" title={nota.descricao_produto}>
                    {nota.descricao_produto && nota.descricao_produto !== "—" ? nota.descricao_produto : "—"}
                  </td>
                  <td className="px-2 py-2.5">{formatDate(nota.venc01)}</td>
                  <td className="px-2 py-2.5">{formatDate(nota.venc02)}</td>
                  <td className="px-2 py-2.5">{formatDate(nota.venc03)}</td>
                  <td className="px-2 py-2.5 text-slate-600 truncate max-w-[110px]" title={nota.observacao}>
                    {nota.observacao && nota.observacao !== "—" ? nota.observacao : "—"}
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-600 hover:text-slate-900"
                        onClick={() => handleAbrirDetalhes(nota)}
                        title="Ver Detalhes"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-700"
                        onClick={() => handleDeletarNota(nota.id, nota.nf)}
                        title="Excluir Nota"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
