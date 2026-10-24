import React, { useMemo } from 'react';
import { Product } from '../types/erp';
import { groupProductsByCategoryAndLine, formatBRL } from '../utils/formatters';

export interface GroupedProductSelectProps {
  products: Product[];
  value: string;
  onChange: (productId: string) => void;
  disabled?: boolean;
  className?: string;
  showCostPrice?: boolean;
  formatOptionLabel?: (product: Product) => string;
}

/**
 * Componente Seletor de Produtos Agrupado com Hierarquia Visual:
 * - Nível 1: Categoria (ex: Terços, Pulseiras) - Título principal
 * - Nível 2: Linha (ex: Linha Raízes, Linha Fidelis, Personalizados) - Subtítulo
 * - Itens Selecionáveis: Modelos ordenados estritamente em ordem alfabética (A-Z)
 * - Rótulos <optgroup> inativos para clique, servindo como títulos separadores visuais
 */
export const GroupedProductSelect: React.FC<GroupedProductSelectProps> = ({
  products,
  value,
  onChange,
  disabled = false,
  className,
  showCostPrice = false,
  formatOptionLabel,
}) => {
  const groupedCategories = useMemo(() => {
    return groupProductsByCategoryAndLine(products);
  }, [products]);

  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={
        className ||
        'w-full text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer'
      }
    >
      {groupedCategories.length === 0 ? (
        <option value="" disabled>Nenhum produto cadastrado no momento</option>
      ) : (
        groupedCategories.map((catGroup) => (
          <React.Fragment key={catGroup.category}>
            {catGroup.lines.map((line) => {
              // Rótulo hierárquico com separadores inativos para clique
              const isGeneral = line.lineName === 'Modelos Gerais' || line.lineName === 'Geral' || line.lineName === 'Outros Terços';
              const groupLabel = isGeneral
                ? `📁 ${catGroup.category.toUpperCase()} (${line.products.length})`
                : `📁 ${catGroup.category.toUpperCase()} ▸ ${line.lineName} (${line.products.length})`;

              return (
                <optgroup
                  key={`${catGroup.category}-${line.lineName}`}
                  label={groupLabel}
                >
                  {line.products.map((p) => {
                    const defaultLabel = `[${p.code}] ${p.model} — ${formatBRL(p.salePrice)}${
                      showCostPrice ? ` (Custo: ${formatBRL(p.costPrice)})` : ''
                    }`;

                    return (
                      <option key={p.id} value={p.id}>
                        {formatOptionLabel ? formatOptionLabel(p) : defaultLabel}
                      </option>
                    );
                  })}
                </optgroup>
              );
            })}
          </React.Fragment>
        ))
      )}
    </select>
  );
};
