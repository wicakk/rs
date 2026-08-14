<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Pakai SQL manual (bukan ->change()) supaya tidak perlu install package doctrine/dbal.
        DB::statement('ALTER TABLE tasks MODIFY start_date DATETIME NULL');
        DB::statement('ALTER TABLE tasks MODIFY due_date DATETIME NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE tasks MODIFY start_date DATE NULL');
        DB::statement('ALTER TABLE tasks MODIFY due_date DATE NULL');
    }
};
