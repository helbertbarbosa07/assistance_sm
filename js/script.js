/* Estilos do sistema principal (mantenha seus estilos existentes) */

/* Adicione estilos para as notificações */
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10000;
    animation: slideIn 0.3s ease;
    display: flex;
    align-items: center;
    gap: 10px;
}

.notification.success {
    background: var(--success, #10b981);
}

.notification.error {
    background: var(--danger, #ef4444);
}

.notification.warning {
    background: var(--warning, #f59e0b);
}

.notification.info {
    background: var(--info, #3b82f6);
}

@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

@keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
}

/* Estilos para as páginas de configurações e admin */
.settings-grid, .admin-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 24px;
    margin-top: 24px;
}

.settings-card, .admin-card {
    background: white;
    border-radius: var(--border-radius);
    padding: 24px;
    box-shadow: var(--shadow);
    border: 1px solid var(--border);
}

/* Estilos para feedback */
.feedback-container {
    display: grid;
    grid-template-columns: 1fr 350px;
    gap: 32px;
}

.feedback-form-container, .feedback-stats {
    background: white;
    border-radius: var(--border-radius);
    padding: 32px;
    box-shadow: var(--shadow);
}

.rating-stars {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
}

.star {
    font-size: 32px;
    color: #e5e7eb;
    cursor: pointer;
    transition: color 0.2s ease;
}

.star.active {
    color: #fbbf24;
}

.star:hover {
    color: #fbbf24;
}

/* Estilos para tabelas admin */
.admin-table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    border-radius: var(--border-radius);
    overflow: hidden;
    box-shadow: var(--shadow);
}

.admin-table th {
    background: var(--light);
    padding: 16px;
    text-align: left;
    font-weight: 600;
    color: var(--dark);
    border-bottom: 2px solid var(--border);
}

.admin-table td {
    padding: 16px;
    border-bottom: 1px solid var(--border);
}

.admin-table tr:hover {
    background: var(--light);
}

/* Responsividade */
@media (max-width: 768px) {
    .feedback-container {
        grid-template-columns: 1fr;
    }
    
    .settings-grid, .admin-grid {
        grid-template-columns: 1fr;
    }
    
    .chat-container {
        grid-template-columns: 1fr;
    }
    
    .sidebar-cursos {
        height: 300px;
    }
}
